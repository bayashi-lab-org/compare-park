import type { Client, InValue } from "@libsql/client";

export const RX_SOURCES = [
  "https://cpo.lexus.jp/resource/pdf/rx_202211.pdf",
  "https://cpo.lexus.jp/resource/pdf/rx_202508.pdf",
] as const;

// 5代目・現行型の標準装備時。重量はメーカーオプションで増加する。
export const RX_CORRECTIONS = [
  { trim: "RX350", drive: "2WD", oldHeight: 1700, height: 1705, oldWeight: 1880, weight: 1870 },
  { trim: "RX350", drive: "AWD", oldHeight: 1700, height: 1705, oldWeight: 1950, weight: 1950 },
  { trim: "RX350 version L", drive: "2WD", oldHeight: 1700, height: 1705, oldWeight: 1950, weight: 1870 },
  { trim: "RX350h", drive: "AWD", oldHeight: 1700, height: 1700, oldWeight: 2000, weight: 2010 },
  { trim: "RX450h+ PHEV", drive: "AWD", oldHeight: 1700, height: 1700, oldWeight: 2110, weight: 2160 },
] as const;

type Change = { id: InValue; trimId: InValue; label: string; before: { height: InValue; weight: InValue }; after: { height: number; weight: number } };

/** メーカー・世代・フェーズ・グレード・駆動方式を限定。未知の値は一括で取り消す。 */
export async function correctRxData(client: Client, apply = false): Promise<Change[]> {
  const tx = await client.transaction(apply ? "write" : "read");
  const changes: Change[] = [];
  try {
    for (const correction of RX_CORRECTIONS) {
      const { rows } = await tx.execute({
        sql: `SELECT d.id,d.trim_id,d.height_mm,d.weight_kg,m.id model_id FROM dimensions d
          JOIN trims t ON t.id=d.trim_id JOIN phases p ON p.id=t.phase_id
          JOIN generations g ON g.id=p.generation_id JOIN models m ON m.id=g.model_id
          JOIN makers mk ON mk.id=m.maker_id
          WHERE mk.slug='lexus' AND m.slug='rx' AND g.name='5代目 (2022-)'
          AND p.name='現行型' AND t.name=? AND t.drive_type=?`,
        args: [correction.trim, correction.drive],
      });
      const label = `${correction.trim} ${correction.drive}`;
      if (rows.length !== 1) throw new Error(`RXの対象が一意ではありません: ${label}`);
      const row = rows[0];
      if (row.height_mm === correction.height && row.weight_kg === correction.weight) continue;
      if (row.height_mm !== correction.oldHeight || row.weight_kg !== correction.oldWeight) {
        throw new Error(`未確認のRX諸元変更を検出: ${label}`);
      }
      changes.push({ id: row.id, trimId: row.trim_id, label, before: { height: row.height_mm, weight: row.weight_kg }, after: { height: correction.height, weight: correction.weight } });
      if (apply) {
        await tx.execute({ sql: "UPDATE dimensions SET height_mm=?,weight_kg=?,updated_at=datetime('now') WHERE id=?", args: [correction.height, correction.weight, row.id] });
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
