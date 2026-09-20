import { test } from "node:test";
import assert from "node:assert/strict";
import { compareDimensionToLimit } from "../src/lib/dimension-comparison";

test("RX350の高さ・幅を、制限値との差と注意度で比較する", () => {
  assert.deepEqual(compareDimensionToLimit(1705, 1550), { result: "ng", difference: -155 });
  assert.deepEqual(compareDimensionToLimit(1705, 1750), { result: "caution", difference: 45 });
  assert.deepEqual(compareDimensionToLimit(1705, 1800), { result: "ok", difference: 95 });
  assert.deepEqual(compareDimensionToLimit(1920, 1900), { result: "ng", difference: -20 });
  assert.deepEqual(compareDimensionToLimit(1920, 1950), { result: "caution", difference: 30 });
});

test("上限ぴったりは注意、95%境界は施設判定と一致し、無効値は判定しない", () => {
  assert.deepEqual(compareDimensionToLimit(1800, 1800), { result: "caution", difference: 0 });
  assert.equal(compareDimensionToLimit(1900, 2000)?.result, "ok");
  assert.equal(compareDimensionToLimit(1901, 2000)?.result, "caution");
  for (const value of [0, -1, NaN, Infinity]) {
    assert.equal(compareDimensionToLimit(value, 1800), null);
    assert.equal(compareDimensionToLimit(1705, value), null);
  }
});
