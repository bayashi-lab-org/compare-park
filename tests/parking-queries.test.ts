import { test } from "node:test";
import assert from "node:assert/strict";
import { createFixture } from "./fixtures";

test("二輪施設は検索・直接URL・地域・サイズ・周辺・適合件数の全経路から除外する", async () => {
  const fixture=await createFixture();
  process.env.TURSO_DATABASE_URL=fixture.url;
  delete process.env.TURSO_AUTH_TOKEN;
  try {
    const q=await import("../src/lib/queries");
    assert.equal((await q.getParkingLots()).length,2);
    assert.equal(await q.getParkingLotBySlug("bike"),null);
    assert.equal(await q.getParkingLotBySlug("bicycle"),null);
    assert.ok(await q.getParkingLotBySlug("repark-rep0024655"));
    assert.equal((await q.getParkingLotsForSearch()).length,2);
    assert.equal((await q.getAllRestrictions()).length,2);
    assert.equal((await q.getRestrictionsByWard("渋谷区")).length,2);
    assert.equal((await q.getParkingLotsByWard("渋谷区")).length,2);
    assert.equal((await q.getParkingLotsBySizeCondition("height",2000)).length,2);
    assert.equal((await q.getParkingLotsByWardAndSize("渋谷区","width",1900)).length,2);
    assert.equal((await q.getRestrictionsByParkingLotSlug("bike")).length,0);
    assert.equal((await q.getRelatedParkingLotsByWard("渋谷区",1)).length,1);
    assert.equal((await q.getNearbyParkingLots(35.662,139.702)).length,2);
    assert.equal((await q.getSizeConditionCounts())["height-2000"],2);
  } finally {fixture.close();}
});
