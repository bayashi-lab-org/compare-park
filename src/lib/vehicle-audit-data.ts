import corrections from "../db/vehicle-audit-corrections.json";
import additions from "../db/vehicle-audit-additions.json";

export const VEHICLE_CORRECTIONS = corrections;
export const VEHICLE_ADDITIONS = additions;
export const DIMENSION_FIELDS = ["length_mm", "width_mm", "height_mm", "weight_kg"] as const;

interface SeedVehicle {
  makerSlug: string; modelSlug: string; generationName: string; startYear: number;
  trimName: string; driveType: string; transmission: string;
  lengthMm: number | null; widthMm: number | null; heightMm: number | null; weightKg: number | null;
  minTurningRadiusM: number | null; specificationNote?: string; sourceUrl?: string; phaseName?: string;
}

/** 初期データにも同じ訂正を適用。無効な旧登録を再投入しない。 */
export function correctedVehicleSeeds<T extends SeedVehicle>(cars: T[]): T[] {
  const corrected = cars.flatMap((car) => {
    const c = corrections.find((c) => c.maker === car.makerSlug && c.model === car.modelSlug && c.generation === car.generationName && c.trim === car.trimName && c.drive === car.driveType && c.transmission === car.transmission);
    if (!c) return [car];
    if (!c.published) return [];
    const before = [car.lengthMm, car.widthMm, car.heightMm, car.weightKg];
    if (!DIMENSION_FIELDS.every((field, i) => before[i] === c.before[field])) throw new Error(`初期データの未確認変更: ${car.modelSlug}/${car.trimName}`);
    return [{ ...car, generationName: c.generationAfter ?? car.generationName, startYear: c.startYearAfter ?? car.startYear,
      trimName: c.trimAfter ?? car.trimName, lengthMm: c.after.length_mm, widthMm: c.after.width_mm, heightMm: c.after.height_mm, weightKg: c.after.weight_kg,
      specificationNote: c.note, sourceUrl: c.source }];
  });
  for (const a of additions) {
    const base = cars.find((car) => car.modelSlug === a.model && car.makerSlug === a.maker);
    if (!base) throw new Error(`追加先の初期データがありません: ${a.model}`);
    corrected.push({ ...base, generationName: a.generation, startYear: a.startYear, trimName: a.trim, driveType: a.drive, transmission: a.transmission,
      lengthMm: a.length_mm, widthMm: a.width_mm, heightMm: a.height_mm, weightKg: a.weight_kg, minTurningRadiusM: null,
      specificationNote: a.note, sourceUrl: a.source, phaseName: a.phase });
  }
  return corrected;
}
