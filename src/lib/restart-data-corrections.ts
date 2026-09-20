import type { Client, InValue } from "@libsql/client";

export const ALPHARD_SOURCE = "https://toyota.jp/pages/contents/alphard/004_p_001/pdf/alphard_spec_202606.pdf";
export const ALPHARD_CORRECTIONS = [
  { trim: "Z 2.5L ガソリン", drive: "4WD", oldWeight: 2130, weight: 2120, height: 1935 },
  { trim: "Executive Lounge 2.5L HV", drive: "2WD", oldWeight: 2090, weight: 2230, height: 1935 },
  { trim: "Executive Lounge 2.5L HV", drive: "4WD", oldWeight: 2160, weight: 2290, height: 1935 },
  { trim: "Z PHEV", drive: "4WD", oldWeight: 2290, weight: 2440, height: 1945 },
] as const;

export const ADDRESS_CORRECTIONS = [
  { slug: "repark-rep0024655", address: "東京都渋谷区神宮前６丁目２０ー１０" },
  { slug: "repark-rep0024657", address: "東京都渋谷区渋谷１丁目２６ー５" },
] as const;

type Change = { table: "dimensions" | "parking_lots"; id: InValue; label: string; before: unknown; after: unknown };

/** 対象を一意に特定し、既知の旧値だけを直す。再実行時は更新しない。 */
export async function correctRestartData(client: Client, apply = false): Promise<Change[]> {
  const tx = await client.transaction(apply ? "write" : "read");
  const changes: Change[] = [];
  try {
    for (const correction of ADDRESS_CORRECTIONS) {
      const { rows } = await tx.execute({ sql: "SELECT id,address FROM parking_lots WHERE slug=?", args: [correction.slug] });
      if (rows.length !== 1) throw new Error(`住所の対象が一意ではありません: ${correction.slug}`);
      const row = rows[0];
      if (row.address === correction.address) continue;
      if (typeof row.address !== "string" || !row.address.includes("手帳") || !row.address.endsWith(correction.address)) {
        throw new Error(`未確認の住所変更を検出: ${correction.slug}`);
      }
      changes.push({ table: "parking_lots", id: row.id, label: correction.slug, before: row.address, after: correction.address });
      if (apply) await tx.execute({ sql: "UPDATE parking_lots SET address=?,updated_at=datetime('now') WHERE id=?", args: [correction.address,row.id] });
    }

    for (const correction of ALPHARD_CORRECTIONS) {
      const { rows } = await tx.execute({
        sql: `SELECT d.id,d.height_mm,d.weight_kg,m.id model_id FROM dimensions d
          JOIN trims t ON t.id=d.trim_id JOIN phases p ON p.id=t.phase_id
          JOIN generations g ON g.id=p.generation_id JOIN models m ON m.id=g.model_id
          WHERE m.slug='alphard' AND g.name='40系 (2023-)' AND p.name='現行型' AND t.name=? AND t.drive_type=?`,
        args: [correction.trim,correction.drive],
      });
      if (rows.length !== 1) throw new Error(`諸元の対象が一意ではありません: ${correction.trim} ${correction.drive}`);
      const row = rows[0];
      if (row.weight_kg === correction.weight && row.height_mm === correction.height) continue;
      if (row.weight_kg !== correction.oldWeight || row.height_mm !== 1935) {
        throw new Error(`未確認の諸元変更を検出: ${correction.trim} ${correction.drive}`);
      }
      changes.push({ table: "dimensions", id: row.id, label: `${correction.trim} ${correction.drive}`, before: { weight: row.weight_kg, height: row.height_mm }, after: { weight: correction.weight, height: correction.height } });
      if (apply) {
        await tx.execute({ sql: "UPDATE dimensions SET weight_kg=?,height_mm=?,updated_at=datetime('now') WHERE id=?", args: [correction.weight,correction.height,row.id] });
        await tx.execute({ sql: "UPDATE models SET updated_at=datetime('now') WHERE id=?", args: [row.model_id] });
      }
    }
    if (apply) await tx.commit();
    else await tx.rollback();
    return changes;
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally {
    tx.close();
  }
}
