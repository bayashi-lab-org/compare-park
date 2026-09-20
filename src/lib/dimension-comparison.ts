import type { MatchResult } from "./matching";

/** 単一寸法の比較。差分は制限−車、制限の95%超は施設判定と同じ注意表示。 */
export function compareDimensionToLimit(value: number, limit: number): { result: MatchResult; difference: number } | null {
  if (!Number.isFinite(value) || !Number.isFinite(limit) || value <= 0 || limit <= 0) return null;
  return {
    result: value > limit ? "ng" : value / limit > 0.95 ? "caution" : "ok",
    difference: limit - value,
  };
}
