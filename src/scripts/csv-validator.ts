import type { ParsedParkingLot } from "./csv-parser";
import { hasContaminatedAddress, isCarParkingName } from "../lib/parking-data-quality";

export interface ValidationError {
  lot: string;
  field: string;
  message: string;
}

const SLUG_REGEX = /^[a-z0-9-]+$/;

const VALID_PARKING_TYPES = ["mechanical", "self_propelled", "flat", "tower"];
const VALID_FEE_TYPES = ["hourly", "daily", "monthly"];

// 日本国内の座標範囲
const LAT_MIN = 24.0;
const LAT_MAX = 46.0;
const LNG_MIN = 122.0;
const LNG_MAX = 154.0;

// 寸法の妥当な範囲
const DIM_MIN = 1000;
const DIM_MAX = 10000;
const WEIGHT_MIN = 500;
const WEIGHT_MAX = 5000;

export function validateParkingLots(
  lots: ParsedParkingLot[],
  existingSlugs: Set<string> = new Set()
): ValidationError[] {
  const errors: ValidationError[] = [];
  const csvSlugs = new Set<string>();

  for (const lot of lots) {
    const id = `${lot.name} (${lot.slug})`;

    // 必須フィールド
    if (!lot.name) errors.push({ lot: id, field: "name", message: "名前が空です" });
    if (!lot.slug) errors.push({ lot: id, field: "slug", message: "slugが空です" });
    if (!isCarParkingName(lot.name)) {
      errors.push({ lot: id, field: "name", message: "二輪・駐輪施設は乗用車データへ登録できません" });
    }
    if (hasContaminatedAddress(lot.address)) {
      errors.push({ lot: id, field: "address", message: "住所に案内文が混入しています" });
    }

    // slug形式
    if (lot.slug && !SLUG_REGEX.test(lot.slug)) {
      errors.push({ lot: id, field: "slug", message: `不正なslug形式: ${lot.slug}（英小文字・数字・ハイフンのみ）` });
    }

    // slug重複（CSV内）
    if (csvSlugs.has(lot.slug)) {
      errors.push({ lot: id, field: "slug", message: `CSV内でslugが重複: ${lot.slug}` });
    }
    csvSlugs.add(lot.slug);

    // slug重複（DB内）
    if (existingSlugs.has(lot.slug)) {
      errors.push({ lot: id, field: "slug", message: `DBに既存のslug: ${lot.slug}` });
    }

    // 座標
    if (lot.latitude && (lot.latitude < LAT_MIN || lot.latitude > LAT_MAX)) {
      errors.push({ lot: id, field: "latitude", message: `緯度が日本国外: ${lot.latitude}` });
    }
    if (lot.longitude && (lot.longitude < LNG_MIN || lot.longitude > LNG_MAX)) {
      errors.push({ lot: id, field: "longitude", message: `経度が日本国外: ${lot.longitude}` });
    }

    // parking_type
    if (lot.parkingType && !VALID_PARKING_TYPES.includes(lot.parkingType)) {
      errors.push({ lot: id, field: "parking_type", message: `不正なparking_type: ${lot.parkingType}` });
    }

    // 制限
    if (lot.restrictions.length === 0) {
      errors.push({ lot: id, field: "restrictions", message: "制限データがありません" });
    }

    for (const r of lot.restrictions) {
      if (!r.name) {
        errors.push({ lot: id, field: "restriction_name", message: "制限名が空です" });
      }
      if (r.maxLengthMm && (r.maxLengthMm < DIM_MIN || r.maxLengthMm > DIM_MAX)) {
        errors.push({ lot: id, field: "max_length_mm", message: `全長が範囲外: ${r.maxLengthMm}mm` });
      }
      if (r.maxWidthMm && (r.maxWidthMm < DIM_MIN || r.maxWidthMm > DIM_MAX)) {
        errors.push({ lot: id, field: "max_width_mm", message: `全幅が範囲外: ${r.maxWidthMm}mm` });
      }
      if (r.maxHeightMm && (r.maxHeightMm < DIM_MIN || r.maxHeightMm > DIM_MAX)) {
        errors.push({ lot: id, field: "max_height_mm", message: `全高が範囲外: ${r.maxHeightMm}mm` });
      }
      if (r.maxWeightKg && (r.maxWeightKg < WEIGHT_MIN || r.maxWeightKg > WEIGHT_MAX)) {
        errors.push({ lot: id, field: "max_weight_kg", message: `重量が範囲外: ${r.maxWeightKg}kg` });
      }
    }

    // 料金
    for (const f of lot.fees) {
      if (!VALID_FEE_TYPES.includes(f.feeType)) {
        errors.push({ lot: id, field: "fee_type", message: `不正なfee_type: ${f.feeType}` });
      }
      if (f.amountYen <= 0) {
        errors.push({ lot: id, field: "amount_yen", message: `料金が0以下: ${f.amountYen}` });
      }
    }
  }

  return errors;
}
