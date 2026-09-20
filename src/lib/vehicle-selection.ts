/** Page links and saved cars share the same model / generation / trim identity. */
export interface VehicleSelection {
  carSlug: string;
  generationId?: number;
  trimId?: number;
}

export interface VehicleGrade {
  generationId: number;
  generationName: string;
  startYear: number | null;
  endYear: number | null;
  phaseName: string;
  trimId: number;
  trimName: string;
  driveType: string | null;
  transmission: string | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  weightKg: number | null;
  specificationNote?: string | null;
  sourceUrl?: string | null;
}

export function resolveVehicleGrade<
  T extends Pick<VehicleGrade, "generationId" | "trimId">,
>(
  grades: T[],
  selection: Pick<VehicleSelection, "generationId" | "trimId">,
): T | null {
  const { generationId, trimId } = selection;
  if (
    [generationId, trimId].some(
      (id) => id !== undefined && (!Number.isSafeInteger(id) || id <= 0),
    )
  )
    return null;
  return (
    grades.find(
      (grade) =>
        (generationId === undefined || grade.generationId === generationId) &&
        (trimId === undefined || grade.trimId === trimId),
    ) ?? null
  );
}

export function vehicleHref(path: string, selection: VehicleSelection): string {
  const url = new URL(path, "https://www.tomepita.com");
  if (!/\/car\/[^/]+$/.test(url.pathname))
    url.searchParams.set("car", selection.carSlug);
  for (const [key, value] of [
    ["gen", selection.generationId],
    ["trim", selection.trimId],
  ] as const) {
    if (value !== undefined && Number.isSafeInteger(value) && value > 0)
      url.searchParams.set(key, String(value));
    else url.searchParams.delete(key);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function phaseLabel(name: string): string {
  return name === "現行型" ? "登録仕様（年式・装備を確認）" : name;
}

export function gradeLabel(grade: VehicleGrade): string {
  return [
    grade.generationName,
    phaseLabel(grade.phaseName),
    grade.trimName,
    grade.driveType,
    grade.transmission,
  ]
    .filter(Boolean)
    .join(" / ");
}

export function gradeDimensions(grade: VehicleGrade) {
  return {
    length_mm: grade.lengthMm,
    width_mm: grade.widthMm,
    height_mm: grade.heightMm,
    weight_kg: grade.weightKg,
  };
}

export function normalizeSearch(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\sー‐‑–—−-]/g, "");
}
