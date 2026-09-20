export type MatchResult = "ok" | "caution" | "ng";

export interface DimensionDetail {
  dimension: string;
  label: string;
  value: number;
  limit: number;
  ratio: number;
}

export interface MatchDetail {
  result: MatchResult;
  details: DimensionDetail[];
}

/**
 * 車の寸法と駐車場の制限値を比較し、マッチング判定を行う。
 *
 * - 全寸法が制限の 95% 以下 -> OK
 * - いずれかが 95-100% -> CAUTION
 * - いずれかが超過 -> NG
 */
export function calculateMatch(
  dimension: {
    length_mm: number | null;
    width_mm: number | null;
    height_mm: number | null;
    weight_kg: number | null;
  },
  restriction: {
    max_length_mm: number | null;
    max_width_mm: number | null;
    max_height_mm: number | null;
    max_weight_kg: number | null;
  }
): MatchDetail {
  const checks: {
    dimension: string;
    label: string;
    value: number | null;
    limit: number | null;
    unit: string;
  }[] = [
    {
      dimension: "length",
      label: "全長",
      value: dimension.length_mm,
      limit: restriction.max_length_mm,
      unit: "mm",
    },
    {
      dimension: "width",
      label: "全幅",
      value: dimension.width_mm,
      limit: restriction.max_width_mm,
      unit: "mm",
    },
    {
      dimension: "height",
      label: "全高",
      value: dimension.height_mm,
      limit: restriction.max_height_mm,
      unit: "mm",
    },
    {
      dimension: "weight",
      label: "重量",
      value: dimension.weight_kg,
      limit: restriction.max_weight_kg,
      unit: "kg",
    },
  ];

  const details: DimensionDetail[] = [];
  let overallResult: MatchResult = "ok";

  for (const check of checks) {
    if (check.value == null || check.limit == null || !Number.isFinite(check.value) || !Number.isFinite(check.limit) || check.value <= 0 || check.limit <= 0) continue;

    const ratio = check.value / check.limit;
    details.push({
      dimension: check.dimension,
      label: check.label,
      value: check.value,
      limit: check.limit,
      ratio,
    });

    if (ratio > 1.0) {
      overallResult = "ng";
    } else if (ratio > 0.95 && overallResult !== "ng") {
      overallResult = "caution";
    }
  }

  // 欠損を「駐車可能」と解釈しない。超過があればNGを優先する。
  if (details.length < checks.length && overallResult === "ok") overallResult = "caution";
  return { result: overallResult, details };
}

/**
 * CAUTION/NG の理由を1行テキストで返す。
 * 最も危険（ratioが大きい）な項目を優先表示。
 */
export function formatMatchReason(details: DimensionDetail[]): string | null {
  // ratio が大きい順にソート
  const sorted = [...details].sort((a, b) => b.ratio - a.ratio);
  const worst = sorted[0];
  if (!worst) return null;

  const unit = worst.dimension === "weight" ? "kg" : "mm";

  if (worst.ratio > 1.0) {
    const diff = Math.round(worst.value - worst.limit);
    return `${worst.label} ${diff}${unit}超過`;
  }
  if (worst.ratio > 0.95) {
    const diff = Math.round(worst.limit - worst.value);
    return `${worst.label}あと${diff}${unit}`;
  }
  return null;
}

/** 駐車場制限レコードの共通型 */
export interface RestrictionRecord {
  id: number;
  parking_lot_id: number;
  parking_lot_name: string;
  parking_lot_slug: string;
  parking_lot_address: string | null;
  parking_type: string | null;
  latitude: number | null;
  longitude: number | null;
  max_length_mm: number | null;
  max_width_mm: number | null;
  max_height_mm: number | null;
  max_weight_kg: number | null;
}

/** ParkingMatchList に渡すデータ */
export interface ParkingMatchItem {
  restrictionId: number;
  parkingLotName: string;
  parkingLotSlug: string;
  parkingLotAddress: string;
  latitude: number | null;
  longitude: number | null;
  parkingType: string;
  result: MatchResult;
  details: DimensionDetail[];
  reason: string | null;
}

/**
 * 車種の寸法と駐車場制限のリストからマッチング判定を行い、
 * 同一駐車場の最良結果でグルーピングした結果を返す。
 *
 * car/[slug] と area/[ward]/car/[slug] の共通パイプライン。
 */
export function buildParkingMatchItems(
  dimension: {
    length_mm: number | null;
    width_mm: number | null;
    height_mm: number | null;
    weight_kg: number | null;
  } | null,
  restrictions: RestrictionRecord[],
): { items: ParkingMatchItem[]; matchDetails: MatchDetail[] } {
  if (!dimension) {
    return { items: [], matchDetails: [] };
  }

  const matchResults = restrictions.map((r) => {
    const match = calculateMatch(
      {
        length_mm: dimension.length_mm,
        width_mm: dimension.width_mm,
        height_mm: dimension.height_mm,
        weight_kg: dimension.weight_kg,
      },
      {
        max_length_mm: r.max_length_mm,
        max_width_mm: r.max_width_mm,
        max_height_mm: r.max_height_mm,
        max_weight_kg: r.max_weight_kg,
      },
    );
    return { restriction: r, match };
  });

  matchResults.sort(
    (a, b) => matchSortOrder(a.match.result) - matchSortOrder(b.match.result),
  );

  // 同一駐車場で複数制限がある場合、最良の結果のみ
  const parkingResultMap = new Map<number, (typeof matchResults)[number]>();
  for (const mr of matchResults) {
    const existing = parkingResultMap.get(mr.restriction.parking_lot_id);
    if (
      !existing ||
      matchSortOrder(mr.match.result) < matchSortOrder(existing.match.result)
    ) {
      parkingResultMap.set(mr.restriction.parking_lot_id, mr);
    }
  }

  const uniqueResults = Array.from(parkingResultMap.values()).sort(
    (a, b) => matchSortOrder(a.match.result) - matchSortOrder(b.match.result),
  );

  const items: ParkingMatchItem[] = uniqueResults.map((item) => ({
    restrictionId: item.restriction.id,
    parkingLotName: item.restriction.parking_lot_name,
    parkingLotSlug: item.restriction.parking_lot_slug,
    parkingLotAddress: item.restriction.parking_lot_address ?? "",
    latitude: item.restriction.latitude,
    longitude: item.restriction.longitude,
    parkingType: item.restriction.parking_type ?? "",
    result: item.match.result,
    details: item.match.details,
    reason: formatMatchReason(item.match.details),
  }));

  const matchDetails = uniqueResults.map((r) => r.match);

  return { items, matchDetails };
}

/**
 * エリア×車種ページ用の判定サマリー文を生成。
 * 車種名・寸法・判定結果をもとに、ページごとにユニークなテキストを返す。
 */
export function generateMatchSummary(
  carName: string,
  makerName: string,
  areaName: string,
  dimension: {
    length_mm: number | null;
    width_mm: number | null;
    height_mm: number | null;
    weight_kg: number | null;
  } | null,
  results: { result: MatchResult; details: DimensionDetail[] }[],
  totalParkingCount: number,
): string[] {
  if (!dimension) {
    return [`${makerName} ${carName}の寸法データはまだ登録されていないため、${areaName}の駐車場との適合判定ができません。`];
  }

  const okCount = results.filter((r) => r.result === "ok").length;
  const cautionCount = results.filter((r) => r.result === "caution").length;
  const ngCount = results.filter((r) => r.result === "ng").length;
  const lines: string[] = [];

  // 判定結果サマリー
  if (totalParkingCount === 0) {
    lines.push(`${areaName}にはまだ駐車場データが登録されていません。`);
    return lines;
  }

  if (okCount > 0) {
    lines.push(
      `${makerName} ${carName}は、${areaName}の駐車場${totalParkingCount}件中${okCount}件で駐車可能（OK判定）です。`
    );
  } else {
    lines.push(
      `${makerName} ${carName}は、${areaName}に登録されている駐車場${totalParkingCount}件のうち、OK判定の駐車場はありません。`
    );
  }

  if (cautionCount > 0) {
    lines.push(
      `${cautionCount}件はギリギリ（制限値に近い）の判定で、駐車場の実測値によっては駐車できる可能性があります。`
    );
  }

  // 寸法ごとのボトルネック分析
  const ngDetails = results
    .filter((r) => r.result === "ng")
    .flatMap((r) => r.details.filter((d) => d.ratio > 1.0));

  if (ngDetails.length > 0) {
    // どの寸法がNGの原因か集計
    const dimCounts = new Map<string, number>();
    for (const d of ngDetails) {
      dimCounts.set(d.label, (dimCounts.get(d.label) ?? 0) + 1);
    }
    const sorted = [...dimCounts.entries()].sort((a, b) => b[1] - a[1]);
    const topCause = sorted[0];

    if (topCause) {
      const dimValue = ngDetails.find((d) => d.label === topCause[0]);
      if (dimValue) {
        const unit = dimValue.dimension === "weight" ? "kg" : "mm";
        lines.push(
          `NG判定の主な原因は${topCause[0]}（${dimValue.value.toLocaleString()}${unit}）で、${ngCount}件中${topCause[1]}件がこの寸法で制限を超えています。`
        );
      }
    }
  }

  // 必要な駐車場条件の提示
  const conditions: string[] = [];
  if (dimension.height_mm != null && dimension.height_mm > 1550) {
    conditions.push(`全高${dimension.height_mm.toLocaleString()}mm以上対応`);
  }
  if (dimension.width_mm != null && dimension.width_mm > 1850) {
    conditions.push(`全幅${dimension.width_mm.toLocaleString()}mm以上対応`);
  }
  if (dimension.weight_kg != null && dimension.weight_kg > 2000) {
    conditions.push(`重量${dimension.weight_kg.toLocaleString()}kg以上対応`);
  }

  if (conditions.length > 0) {
    lines.push(
      `${carName}を停めるには、${conditions.join("・")}の駐車場を選ぶ必要があります。`
    );
  }

  return lines;
}

/** マッチング結果のソート順 (OK -> CAUTION -> NG) */
export function matchSortOrder(result: MatchResult): number {
  switch (result) {
    case "ok":
      return 0;
    case "caution":
      return 1;
    case "ng":
      return 2;
  }
}
