import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveVehicleGrade,
  vehicleHref,
  normalizeSearch,
} from "../src/lib/vehicle-selection";

const grades = [
  { generationId: 1120, trimId: 4328 },
  { generationId: 1120, trimId: 4332 },
  { generationId: 1090, trimId: 4020 },
];

test("PHEVの選択が車種→エリア→駐車場と現在地検索に保持される", () => {
  const selection = { carSlug: "alphard", generationId: 1120, trimId: 4332 };
  assert.equal(
    vehicleHref("/car/alphard", selection),
    "/car/alphard?gen=1120&trim=4332",
  );
  assert.equal(
    vehicleHref("/area/shibuya/car/alphard", selection),
    "/area/shibuya/car/alphard?gen=1120&trim=4332",
  );
  assert.equal(
    vehicleHref("/parking/example#checker", selection),
    "/parking/example?car=alphard&gen=1120&trim=4332#checker",
  );
  assert.equal(
    vehicleHref("/search?lat=35.6&lng=139.7", selection),
    "/search?lat=35.6&lng=139.7&car=alphard&gen=1120&trim=4332",
  );
});

test("不正なグレード・世代の組み合わせを代表グレードへ置き換えない", () => {
  assert.equal(
    resolveVehicleGrade(grades, { generationId: 1120, trimId: 4332 })?.trimId,
    4332,
  );
  assert.equal(
    resolveVehicleGrade(grades, { generationId: 1090, trimId: 4332 }),
    null,
  );
  assert.equal(resolveVehicleGrade(grades, { trimId: 9999 }), null);
  assert.equal(resolveVehicleGrade(grades, { generationId: NaN }), null);
  assert.equal(resolveVehicleGrade(grades, {})?.trimId, 4328);
  assert.equal(resolveVehicleGrade([], {}), null);
});

test("検索の全半角・ハイフン・スペースの違いを吸収する", () => {
  assert.equal(normalizeSearch("Ｎ－ＢＯＸ"), normalizeSearch("n box"));
  assert.equal(normalizeSearch("WR-V"), normalizeSearch("wrv"));
});
