import { test } from "node:test";
import assert from "node:assert/strict";
import { createFixture } from "./fixtures";
import { correctRxData } from "../src/lib/rx-data-corrections";

async function rxFixture() {
  const fixture = await createFixture();
  const { client } = fixture;
  await client.execute("INSERT INTO makers(id,name,slug) VALUES(2,'レクサス','lexus')");
  await client.execute("INSERT INTO models(id,maker_id,name,slug,body_type,updated_at) VALUES(2,2,'RX','rx','suv','2026-01-01')");
  await client.execute("INSERT INTO generations(id,model_id,name,start_year) VALUES(3,2,'5代目 (2022-)',2022),(4,2,'4代目 (2015-2022)',2015)");
  await client.execute("INSERT INTO phases(id,generation_id,name) VALUES(3,3,'現行型'),(4,4,'前期型')");
  const rows = [
    [101, 'RX350', '2WD', 1700, 1880],
    [102, 'RX350', 'AWD', 1700, 1950],
    [103, 'RX350 version L', '2WD', 1700, 1950],
    [104, 'RX350h', 'AWD', 1700, 2000],
    [105, 'RX450h+ PHEV', 'AWD', 1700, 2110],
    [106, 'RX500h F SPORT Performance', 'AWD', 1700, 2100],
  ];
  for (const [id, name, drive, height, weight] of rows) {
    await client.execute({ sql: "INSERT INTO trims(id,phase_id,name,drive_type) VALUES(?,3,?,?)", args: [id, name, drive] });
    await client.execute({ sql: "INSERT INTO dimensions(id,trim_id,length_mm,width_mm,height_mm,weight_kg) VALUES(?,?,4890,1920,?,?)", args: [id, id, height, weight] });
  }
  // 同名グレードでも旧世代を変更してはいけない。
  await client.execute("INSERT INTO trims(id,phase_id,name,drive_type) VALUES(110,4,'RX350','2WD')");
  await client.execute("INSERT INTO dimensions(id,trim_id,height_mm,weight_kg) VALUES(110,110,1710,1890)");
  return fixture;
}

test("RXのdry-runは無変更、5件だけ訂正し、旧世代・他グレードを維持する", async () => {
  const fixture = await rxFixture();
  try {
    assert.equal((await correctRxData(fixture.client)).length, 5);
    assert.equal((await fixture.client.execute("SELECT height_mm FROM dimensions WHERE id=101")).rows[0].height_mm, 1700);
    assert.equal((await correctRxData(fixture.client, true)).length, 5);
    const { rows } = await fixture.client.execute("SELECT height_mm,weight_kg FROM dimensions WHERE id>=101 ORDER BY id");
    assert.deepEqual(rows.map(r => [r.height_mm, r.weight_kg]), [[1705,1870],[1705,1950],[1705,1870],[1700,2010],[1700,2160],[1700,2100],[1710,1890]]);
    assert.deepEqual(await correctRxData(fixture.client, true), []);
  } finally { fixture.close(); }
});

test("RXの未知の諸元があれば、先に更新した寸法と更新日もロールバックする", async () => {
  const fixture = await rxFixture();
  try {
    await fixture.client.execute("UPDATE dimensions SET height_mm=9999 WHERE id=105");
    await assert.rejects(() => correctRxData(fixture.client, true), /未確認のRX諸元/);
    assert.equal((await fixture.client.execute("SELECT height_mm FROM dimensions WHERE id=101")).rows[0].height_mm, 1700);
    assert.equal((await fixture.client.execute("SELECT updated_at FROM models WHERE id=2")).rows[0].updated_at, '2026-01-01');
  } finally { fixture.close(); }
});

test("RXの対象が欠損・重複していれば、部分更新せず停止する", async () => {
  for (const duplicate of [false, true]) {
    const fixture = await rxFixture();
    try {
      if (duplicate) await fixture.client.execute("INSERT INTO dimensions(trim_id,height_mm,weight_kg) VALUES(105,1700,2110)");
      else await fixture.client.execute("DELETE FROM dimensions WHERE id=105");
      await assert.rejects(() => correctRxData(fixture.client, true), /一意ではありません/);
      assert.equal((await fixture.client.execute("SELECT height_mm FROM dimensions WHERE id=101")).rows[0].height_mm, 1700);
    } finally { fixture.close(); }
  }
});
