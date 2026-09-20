import { test } from "node:test";
import assert from "node:assert/strict";
import { extractTokyoParkingAddress, isCarParkingName } from "../src/lib/parking-data-quality";
import { parseCsvFile } from "../src/scripts/csv-parser";
import { validateParkingLots } from "../src/scripts/csv-validator";
import { generateMatchSummary } from "../src/lib/matching";

test("住所の前にある手帳の案内文を取り込まない", () => {
  const html = '<p>東京都が発行する愛の手帳・精神障害者保健福祉手帳</p><th>住所</th><td>東京都渋谷区神宮前６丁目２０ー１０</td>';
  assert.equal(extractTokyoParkingAddress(html), "東京都渋谷区神宮前６丁目２０ー１０");
  assert.equal(extractTokyoParkingAddress("東京都が発行する愛の手帳"), null);
  assert.equal(extractTokyoParkingAddress('<dt>所在地</dt><dd><span>東京都港区虎ノ門２丁目２ー３</span></dd>'), "東京都港区虎ノ門２丁目２ー３");
});

test("バイク・駐輪施設と通常の駐車場を区別する", () => {
  for (const name of ["宮下公園南バイク駐車場", "時間貸駐輪場", "二輪専用駐車場"]) assert.equal(isCarParkingName(name), false);
  assert.equal(isCarParkingName("宮下公園南駐車場"), true);
});

test("CSVに再混入した二輪施設・案内文を拒否する", () => {
  const [base] = parseCsvFile("data/all-parking.csv");
  assert.ok(validateParkingLots([{ ...base, name: "宮下公園南バイク駐車場" }]).some((error) => error.field === "name"));
  assert.ok(validateParkingLots([{ ...base, address: "東京都が発行する愛の手帳東京都渋谷区渋谷１丁目２６ー５" }]).some((error) => error.field === "address"));
  for (const file of ["data/all-parking.csv", "data/repark-parking-full.csv", "data/repark-parking.csv"]) {
    const errors = validateParkingLots(parseCsvFile(file)).filter((error) => ["address", "name"].includes(error.field));
    assert.deepEqual(errors, [], file);
  }
});

test("必要な高さを車両全高より低く案内しない", () => {
  const summary = generateMatchSummary("アルファード", "トヨタ", "渋谷区", { length_mm: 4995, width_mm: 1850, height_mm: 1935, weight_kg: 2440 }, [{ result: "ng", details: [] }], 1);
  assert.ok(summary.join(" ").includes("全高1,935mm以上対応"));
  assert.ok(!summary.join(" ").includes("全高1,800mm以上"));
});
