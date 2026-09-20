import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateMatch } from "../src/lib/matching";

const car = {
  length_mm: 4500,
  width_mm: 1700,
  height_mm: 1450,
  weight_kg: 1500,
};
const lot = {
  max_length_mm: 5000,
  max_width_mm: 1900,
  max_height_mm: 1800,
  max_weight_kg: 2000,
};

test("制限値の欠損・ゼロ・不正値をサイズ条件内としない", () => {
  for (const value of [null, 0, -1, Infinity, NaN]) {
    const result = calculateMatch(car, { ...lot, max_weight_kg: value });
    assert.equal(result.result, "caution");
    assert.equal(result.details.length, 3);
  }
  assert.equal(
    calculateMatch(car, {
      max_length_mm: null,
      max_width_mm: null,
      max_height_mm: null,
      max_weight_kg: null,
    }).result,
    "caution",
  );
});

test("欠損項目があっても既知の超過はNG、4項目に余裕があればOK", () => {
  assert.equal(
    calculateMatch({ ...car, height_mm: 2100 }, { ...lot, max_weight_kg: null })
      .result,
    "ng",
  );
  assert.equal(calculateMatch(car, lot).result, "ok");
});
