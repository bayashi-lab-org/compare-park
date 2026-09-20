import type { Client, Row, Transaction } from "@libsql/client";
import { readFileSync } from "node:fs";
import { VEHICLE_CORRECTIONS, VEHICLE_ADDITIONS, DIMENSION_FIELDS } from "./vehicle-audit-data";

const joins = `FROM dimensions d JOIN trims t ON t.id=d.trim_id
  JOIN phases p ON p.id=t.phase_id JOIN generations g ON g.id=p.generation_id
  JOIN models m ON m.id=g.model_id JOIN makers mk ON mk.id=m.maker_id`;
const selection = `SELECT d.*,t.name trim_name,t.transmission,t.id trim_id,g.name generation_name,
  g.start_year,g.id generation_id,m.id model_id ${joins}`;
const metadataMatches = (row: Row, source: string, note: string, published = true) =>
  row.source_url === source && row.specification_note === note && row.is_published === Number(published);

async function prepareSchema(tx: Transaction, apply: boolean) {
  const columns = (await tx.execute("PRAGMA table_info(dimensions)")).rows.map((row) => row.name);
  const names = ["specification_note", "source_url", "is_published"];
  const present = names.filter((name) => columns.includes(name));
  if (present.length !== 0 && present.length !== 3) throw new Error("諸元スキーマの部分適用を検出しました");
  if (present.length === 0 && apply) {
    const migration = readFileSync(new URL("../../drizzle/0002_nasty_tombstone.sql", import.meta.url), "utf8");
    for (const statement of migration.split("--> statement-breakpoint")) if (statement.trim()) await tx.execute(statement);
  }
}

/** スキーマ追加・訂正・隔離・追加を1トランザクションで実行。既存IDは別グレードへ流用しない。 */
export async function correctVehicleAuditData(client: Client, apply = false) {
  const tx = await client.transaction(apply ? "write" : "read");
  const changes: { action: string; model: string; trim: string; before?: unknown; after?: unknown }[] = [];
  try {
    await prepareSchema(tx, apply);
    for (const c of VEHICLE_CORRECTIONS) {
      const { rows } = await tx.execute({ sql: `${selection} WHERE mk.slug=? AND m.slug=?
        AND g.name IN (?,?) AND p.name=? AND t.name IN (?,?) AND t.drive_type=? AND t.transmission IS ?`,
        args: [c.maker,c.model,c.generation,c.generationAfter ?? c.generation,c.phase,c.trim,c.trimAfter ?? c.trim,c.drive,c.transmission] });
      if (rows.length !== 1) throw new Error(`対象が一意ではありません: ${c.model}/${c.trim}/${c.drive}/${c.transmission}`);
      const row = rows[0];
      const numericAfter = DIMENSION_FIELDS.every((key) => row[key] === c.after[key]);
      const identityAfter = row.trim_name === (c.trimAfter ?? c.trim) && row.generation_name === (c.generationAfter ?? c.generation);
      if (numericAfter && identityAfter && metadataMatches(row,c.source,c.note,c.published) && (c.startYearAfter === undefined || row.start_year === c.startYearAfter)) continue;
      // 同一世代の別行を先に訂正済みの場合のみ、世代の更新後値を許可する。
      const yearKnown = c.startYearBefore === undefined || row.start_year === c.startYearBefore || row.start_year === c.startYearAfter;
      if (!DIMENSION_FIELDS.every((key) => row[key] === c.before[key]) || row.trim_name !== c.trim || !yearKnown || row.source_url != null || row.specification_note != null || (row.is_published ?? 1) !== 1) {
        throw new Error(`未確認の変更を検出: ${c.model}/${c.trim}/${c.drive}/${c.transmission}`);
      }
      changes.push({ action: c.published ? "correct" : "withdraw", model: c.model, trim: `${c.trim} ${c.drive} ${c.transmission}`, before: row, after: c });
      if (apply) {
        await tx.execute({ sql: `UPDATE dimensions SET length_mm=?,width_mm=?,height_mm=?,weight_kg=?,specification_note=?,source_url=?,is_published=?,updated_at=datetime('now') WHERE id=?`,
          args: [...DIMENSION_FIELDS.map((key) => c.after[key]),c.note,c.source,Number(c.published),row.id] });
        if (c.trimAfter) await tx.execute({ sql: "UPDATE trims SET name=?,updated_at=datetime('now') WHERE id=?", args: [c.trimAfter,row.trim_id] });
        if (c.generationAfter) await tx.execute({ sql: "UPDATE generations SET name=?,start_year=?,updated_at=datetime('now') WHERE id=?", args: [c.generationAfter,c.startYearAfter!,row.generation_id] });
        await tx.execute({ sql: "UPDATE models SET updated_at=datetime('now') WHERE id=?", args: [row.model_id] });
      }
    }
    for (const a of VEHICLE_ADDITIONS) {
      const modelRows = (await tx.execute({ sql: "SELECT m.id FROM models m JOIN makers mk ON mk.id=m.maker_id WHERE m.slug=? AND mk.slug=?", args: [a.model,a.maker] })).rows;
      if (modelRows.length !== 1) throw new Error(`追加先が一意ではありません: ${a.model}`);
      const modelId = modelRows[0].id;
      const existing = (await tx.execute({ sql: `${selection} WHERE m.id=? AND g.name=? AND p.name=? AND t.name=? AND t.drive_type=? AND t.transmission=?`, args: [modelId,a.generation,a.phase,a.trim,a.drive,a.transmission] })).rows;
      if (existing.length) {
        if (existing.length !== 1 || !DIMENSION_FIELDS.every((key) => existing[0][key] === a[key]) || !metadataMatches(existing[0],a.source,a.note) || existing[0].start_year !== a.startYear) throw new Error(`追加先に未確認の登録: ${a.model}/${a.trim}`);
        continue;
      }
      changes.push({ action: "add", model: a.model, trim: `${a.trim} ${a.drive}`, after: a });
      if (!apply) continue;
      const gens = (await tx.execute({ sql: "SELECT id,start_year FROM generations WHERE model_id=? AND name=?", args: [modelId,a.generation] })).rows;
      if (gens.length > 1 || (gens[0] && gens[0].start_year !== a.startYear)) throw new Error(`世代の不整合: ${a.model}`);
      const genId = gens[0]?.id ?? (await tx.execute({ sql: "INSERT INTO generations(model_id,name,start_year) VALUES(?,?,?) RETURNING id", args: [modelId,a.generation,a.startYear] })).rows[0].id;
      const phases = (await tx.execute({ sql: "SELECT id FROM phases WHERE generation_id=? AND name=?", args: [genId,a.phase] })).rows;
      if (phases.length > 1) throw new Error(`フェーズの重複: ${a.model}`);
      const phaseId = phases[0]?.id ?? (await tx.execute({ sql: "INSERT INTO phases(generation_id,name) VALUES(?,?) RETURNING id", args: [genId,a.phase] })).rows[0].id;
      const orphan = (await tx.execute({ sql: "SELECT id FROM trims WHERE phase_id=? AND name=? AND drive_type=? AND transmission=?", args: [phaseId,a.trim,a.drive,a.transmission] })).rows;
      if (orphan.length) throw new Error(`寸法のない既存グレードを検出: ${a.model}/${a.trim}`);
      const trimId = (await tx.execute({ sql: "INSERT INTO trims(phase_id,name,drive_type,transmission) VALUES(?,?,?,?) RETURNING id", args: [phaseId,a.trim,a.drive,a.transmission] })).rows[0].id;
      await tx.execute({ sql: "INSERT INTO dimensions(trim_id,length_mm,width_mm,height_mm,weight_kg,specification_note,source_url) VALUES(?,?,?,?,?,?,?)", args: [trimId,a.length_mm,a.width_mm,a.height_mm,a.weight_kg,a.note,a.source] });
      await tx.execute({ sql: "UPDATE models SET updated_at=datetime('now') WHERE id=?", args: [modelId] });
    }
    if (apply) await tx.commit(); else await tx.rollback();
    return changes;
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally { tx.close(); }
}
