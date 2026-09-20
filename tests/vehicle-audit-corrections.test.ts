import { test } from "node:test";
import assert from "node:assert/strict";
import { createFixture } from "./fixtures";
import { correctVehicleAuditData } from "../src/lib/vehicle-audit-corrections";
import { correctedVehicleSeeds, VEHICLE_CORRECTIONS, VEHICLE_ADDITIONS, DIMENSION_FIELDS } from "../src/lib/vehicle-audit-data";
import { calculateMatch } from "../src/lib/matching";
import { resolveVehicleGrade } from "../src/lib/vehicle-selection";

async function auditFixture() {
  const f = await createFixture();
  for (const c of VEHICLE_CORRECTIONS) {
    await f.client.execute({ sql: "INSERT OR IGNORE INTO makers(slug,name) VALUES(?,?)", args: [c.maker,c.maker] });
    const maker = (await f.client.execute({ sql: "SELECT id FROM makers WHERE slug=?", args: [c.maker] })).rows[0].id;
    await f.client.execute({ sql: "INSERT OR IGNORE INTO models(maker_id,slug,name,body_type,is_popular) VALUES(?,?,?,'suv',1)", args: [maker,c.model,c.model] });
    const model = (await f.client.execute({ sql: "SELECT id FROM models WHERE slug=?", args: [c.model] })).rows[0].id;
    const existing = (await f.client.execute({ sql: "SELECT id FROM generations WHERE model_id=? AND name=?", args: [model,c.generation] })).rows[0];
    const gen = existing?.id ?? (await f.client.execute({ sql: "INSERT INTO generations(model_id,name,start_year) VALUES(?,?,?) RETURNING id", args: [model,c.generation,c.startYearBefore ?? (c.model === "freed" ? 2024 : 2020)] })).rows[0].id;
    const phases = (await f.client.execute({ sql: "SELECT id FROM phases WHERE generation_id=? AND name=?", args: [gen,c.phase] })).rows;
    const phase = phases[0]?.id ?? (await f.client.execute({ sql: "INSERT INTO phases(generation_id,name) VALUES(?,?) RETURNING id", args: [gen,c.phase] })).rows[0].id;
    await f.client.execute({ sql: "INSERT INTO trims(id,phase_id,name,drive_type,transmission) VALUES(?,?,?,?,?)", args: [c.auditId,phase,c.trim,c.drive,c.transmission] });
    await f.client.execute({ sql: "INSERT INTO dimensions(id,trim_id,length_mm,width_mm,height_mm,weight_kg) VALUES(?,?,?,?,?,?)", args: [c.auditId,c.auditId,...DIMENSION_FIELDS.map((key) => c.before[key])] });
  }
  return f;
}

test("dry-runは読み取りのみ。全訂正・追加を検出し、再実行は0件。対象外を保持", async () => {
  const f = await auditFixture();
  try {
    const before = (await f.client.execute("SELECT * FROM dimensions ORDER BY id")).rows;
    const preview = await correctVehicleAuditData(f.client);
    assert.equal(preview.length, 62);
    assert.deepEqual((await f.client.execute("SELECT * FROM dimensions ORDER BY id")).rows, before);
    const changes = await correctVehicleAuditData(f.client,true);
    assert.equal(changes.filter((c) => c.action === "withdraw").length,6);
    assert.equal(changes.filter((c) => c.action === "add").length,8);
    assert.deepEqual(await correctVehicleAuditData(f.client,true),[]);
    assert.deepEqual((await f.client.execute("SELECT * FROM dimensions WHERE id=10")).rows[0],before.find((r) => r.id === 10));
    const get = async (id: number) => (await f.client.execute({ sql: "SELECT * FROM dimensions WHERE id=?", args:[id] })).rows[0];
    assert.equal((await get(4340)).height_mm,1925);
    assert.equal((await get(4441)).weight_kg,1780);
    assert.equal((await get(4618)).weight_kg,1040); // ATをMTの値で上書きしない
    assert.equal((await get(4619)).weight_kg,1030);
    assert.equal((await get(4385)).weight_kg,1420);
    assert.equal((await get(4385)).height_mm,1430);
    assert.equal((await get(4428)).weight_kg,1490);
    assert.equal((await get(4616)).height_mm,1575); // 誤検知を再適用しない
    assert.equal((await get(4498)).weight_kg,1990);
    assert.match(String((await get(4498)).specification_note),/18インチ/);
    const restriction = { max_length_mm:6000,max_width_mm:2300,max_height_mm:2500,max_weight_kg:3000 };
    for (const id of [4650,4663,4667,4668,4687,4681]) {
      const r = await get(id);
      assert.equal(r.weight_kg,null);
      assert.equal(calculateMatch({length_mm:Number(r.length_mm),width_mm:Number(r.width_mm),height_mm:Number(r.height_mm),weight_kg:null},restriction).result,"caution");
    }
  } finally { f.close(); }
});

test("未確認の数値・出典・欠損・重複は一括ロールバック", async () => {
  for (const sql of [
    "UPDATE dimensions SET weight_kg=9999 WHERE id=5027",
    "UPDATE dimensions SET source_url='https://example.com' WHERE id=5027",
    "DELETE FROM dimensions WHERE id=5027",
    "INSERT INTO dimensions(trim_id,length_mm,width_mm,height_mm,weight_kg) SELECT trim_id,length_mm,width_mm,height_mm,weight_kg FROM dimensions WHERE id=5027",
  ]) {
    const f = await auditFixture();
    try {
      await f.client.execute(sql);
      const before = (await f.client.execute("SELECT * FROM dimensions ORDER BY id")).rows;
      await assert.rejects(correctVehicleAuditData(f.client,true),/未確認|一意/);
      assert.deepEqual((await f.client.execute("SELECT * FROM dimensions ORDER BY id")).rows,before);
      assert.equal((await f.client.execute("SELECT name FROM trims WHERE id=4383")).rows[0].name,"G HV");
    } finally { f.close(); }
  }
});

test("非公開グレードを全公開クエリから除外し、旧マイカーIDを別グレードへ置換しない", async () => {
  const f = await auditFixture();
  process.env.TURSO_DATABASE_URL=f.url;
  delete process.env.TURSO_AUTH_TOKEN;
  try {
    await correctVehicleAuditData(f.client,true);
    const q = await import("../src/lib/queries");
    const forester = (await q.getModelBySlug("forester"))!;
    const grades = await q.getAllTrimsWithDimensions(forester.id);
    assert.equal(grades.length,6);
    assert.equal(grades[0].startYear,2025);
    assert.equal(resolveVehicleGrade(grades,{trimId:4473}),null);
    assert.equal((await q.getDimensionsByModelId(forester.id))?.weight_kg,1640);
    assert.equal((await q.getPopularModelsWithDimensions()).find((r) => r.slug === "forester")?.weight_kg,1640);
    assert.equal((await q.getModelsByMakerSlug("subaru")).find((r) => r.slug === "forester")?.weight_kg,1640);
    assert.equal(await q.getLatestGenerationYear(forester.id),2025);
    assert.ok(!(await q.getAllDimensions()).some((r) => [4473,4474,4475,4476,4859,4503].includes(r.id)));
    const crv = (await q.getModelBySlug("cr-v"))!;
    assert.ok((await q.getAllTrimsWithDimensions(crv.id)).every((r) => r.startYear === 2026));
  } finally { f.close(); }
});

test("初期データにも訂正と隔離・追加を適用する", () => {
  const cars = VEHICLE_CORRECTIONS.map((c) => ({makerSlug:c.maker,modelSlug:c.model,generationName:c.generation,startYear:2024,trimName:c.trim,driveType:c.drive,transmission:c.transmission,lengthMm:c.before.length_mm,widthMm:c.before.width_mm,heightMm:c.before.height_mm,weightKg:c.before.weight_kg,minTurningRadiusM:5}));
  const result = correctedVehicleSeeds(cars);
  assert.equal(result.length,cars.length-6+VEHICLE_ADDITIONS.length);
  assert.equal(result.find((r) => r.modelSlug === "purosangue")?.weightKg,null);
  assert.ok(result.filter((r) => r.modelSlug === "forester").every((r) => r.startYear === 2025));
  assert.equal(result.find((r) => r.modelSlug === "forester" && r.trimName === "X-BREAK S:HEV")?.weightKg,1730);
});

test("旧スキーマのdry-runは無変更。スキーマ追加も訂正失敗時は取り消す", async () => {
  for (const conflict of [false,true]) {
    const f = await auditFixture();
    try {
      for (const col of ["specification_note","source_url","is_published"]) await f.client.execute(`ALTER TABLE dimensions DROP COLUMN ${col}`);
      if (conflict) await f.client.execute("UPDATE dimensions SET weight_kg=9999 WHERE id=5027");
      else {
        assert.equal((await correctVehicleAuditData(f.client)).length,62);
        assert.ok(!(await f.client.execute("PRAGMA table_info(dimensions)")).rows.some((r) => r.name === "is_published"));
      }
      if (conflict) {
        await assert.rejects(correctVehicleAuditData(f.client,true),/未確認/);
        assert.ok(!(await f.client.execute("PRAGMA table_info(dimensions)")).rows.some((r) => r.name === "is_published"));
      } else {
        await correctVehicleAuditData(f.client,true);
        assert.equal((await f.client.execute("SELECT is_published FROM dimensions WHERE id=4473")).rows[0].is_published,0);
        assert.deepEqual(await correctVehicleAuditData(f.client,true),[]);
      }
    } finally { f.close(); }
  }
});
