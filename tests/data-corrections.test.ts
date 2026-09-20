import { test } from "node:test";
import assert from "node:assert/strict";
import { createFixture } from "./fixtures";
import { correctRestartData } from "../src/lib/restart-data-corrections";

test("dry-runはDBを変更せず、適用は一括・再実行可能で旧世代に触れない", async () => {
  const fixture=await createFixture();
  try {
    assert.equal((await correctRestartData(fixture.client)).length,6);
    assert.equal((await fixture.client.execute("SELECT weight_kg FROM dimensions WHERE id=4")).rows[0].weight_kg,2290);
    assert.equal((await correctRestartData(fixture.client,true)).length,6);
    const row=(await fixture.client.execute("SELECT weight_kg,height_mm FROM dimensions WHERE id=4")).rows[0];
    assert.deepEqual({weight:row.weight_kg,height:row.height_mm},{weight:2440,height:1945});
    assert.equal((await fixture.client.execute("SELECT weight_kg FROM dimensions WHERE id=10")).rows[0].weight_kg,2090);
    assert.deepEqual(await correctRestartData(fixture.client,true),[]);
  } finally {fixture.close();}
});

test("未確認の値があれば住所を含めて全変更をロールバックする", async () => {
  const fixture=await createFixture();
  try {
    await fixture.client.execute("UPDATE dimensions SET weight_kg=9999 WHERE id=4");
    await assert.rejects(()=>correctRestartData(fixture.client,true),/未確認の諸元/);
    assert.match(String((await fixture.client.execute("SELECT address FROM parking_lots WHERE id=1")).rows[0].address),/手帳/);
    assert.equal((await fixture.client.execute("SELECT weight_kg FROM dimensions WHERE id=1")).rows[0].weight_kg,2130);
  } finally {fixture.close();}
});
