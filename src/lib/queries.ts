import { db } from "@/db";
import {
  makers,
  models,
  generations,
  phases,
  trims,
  dimensions,
  parkingLots,
  vehicleRestrictions,
  parkingFees,
  operatingHours,
} from "@/db/schema";
import { eq, and, like, gte, sql } from "drizzle-orm";

// ---------- Makers ----------

export async function getMakers() {
  return db.select().from(makers).orderBy(makers.display_order, makers.name);
}

// ---------- Models ----------

export async function getModelsByMaker(makerId: number) {
  return db.select().from(models).where(eq(models.maker_id, makerId));
}

export async function getModelsWithMaker() {
  return db
    .select({
      id: models.id,
      name: models.name,
      slug: models.slug,
      body_type: models.body_type,
      image_url: models.image_url,
      maker_name: makers.name,
      maker_slug: makers.slug,
    })
    .from(models)
    .innerJoin(makers, eq(models.maker_id, makers.id))
    .orderBy(makers.display_order, models.name);
}

export async function getPopularModels() {
  return db
    .select({
      id: models.id,
      name: models.name,
      slug: models.slug,
      body_type: models.body_type,
      image_url: models.image_url,
      maker_name: makers.name,
      maker_slug: makers.slug,
    })
    .from(models)
    .innerJoin(makers, eq(models.maker_id, makers.id))
    .where(eq(models.is_popular, true))
    .limit(4);
}

export async function getModelBySlug(slug: string) {
  const result = await db
    .select({
      id: models.id,
      name: models.name,
      slug: models.slug,
      body_type: models.body_type,
      image_url: models.image_url,
      maker_id: models.maker_id,
      maker_name: makers.name,
      maker_slug: makers.slug,
      updated_at: models.updated_at,
    })
    .from(models)
    .innerJoin(makers, eq(models.maker_id, makers.id))
    .where(eq(models.slug, slug))
    .limit(1);

  return result[0] ?? null;
}

export async function getPopularModelsWithDimensions() {
  const rows = await db
    .select({
      id: models.id,
      name: models.name,
      slug: models.slug,
      body_type: models.body_type,
      image_url: models.image_url,
      maker_name: makers.name,
      maker_slug: makers.slug,
      length_mm: dimensions.length_mm,
      width_mm: dimensions.width_mm,
      height_mm: dimensions.height_mm,
      weight_kg: dimensions.weight_kg,
    })
    .from(models)
    .innerJoin(makers, eq(models.maker_id, makers.id))
    .innerJoin(generations, eq(generations.model_id, models.id))
    .innerJoin(phases, eq(phases.generation_id, generations.id))
    .innerJoin(trims, eq(trims.phase_id, phases.id))
    .innerJoin(dimensions, eq(dimensions.trim_id, trims.id))
    .where(eq(models.is_popular, true))
    .orderBy(dimensions.id);

  // モデルごとに代表寸法（dimensions.id 最小 = getDimensionsByModelId と同じ基準）を採用
  const byModel = new Map<number, (typeof rows)[number]>();
  for (const row of rows) {
    if (!byModel.has(row.id)) byModel.set(row.id, row);
  }
  return Array.from(byModel.values());
}

/** 指定モデルの最新世代の開始年を取得する */
export async function getLatestGenerationYear(modelId: number) {
  const result = await db
    .select({ startYear: generations.start_year })
    .from(generations)
    .where(eq(generations.model_id, modelId))
    .orderBy(sql`${generations.start_year} DESC`)
    .limit(1);

  return result[0]?.startYear ?? null;
}

// ---------- Dimensions ----------

/**
 * 指定車種の代表寸法を取得する。
 * generations -> phases -> trims -> dimensions の最初の1件を返す。
 */
export async function getDimensionsByModelId(modelId: number) {
  const result = await db
    .select({
      id: dimensions.id,
      trim_id: dimensions.trim_id,
      length_mm: dimensions.length_mm,
      width_mm: dimensions.width_mm,
      width_with_mirrors_mm: dimensions.width_with_mirrors_mm,
      height_mm: dimensions.height_mm,
      weight_kg: dimensions.weight_kg,
      min_turning_radius_m: dimensions.min_turning_radius_m,
      trim_name: trims.name,
      generation_name: generations.name,
    })
    .from(dimensions)
    .innerJoin(trims, eq(dimensions.trim_id, trims.id))
    .innerJoin(phases, eq(trims.phase_id, phases.id))
    .innerJoin(generations, eq(phases.generation_id, generations.id))
    .where(eq(generations.model_id, modelId))
    .orderBy(dimensions.id)
    .limit(1);

  return result[0] ?? null;
}

export async function getAllDimensions() {
  return db
    .select({
      id: dimensions.id,
      length_mm: dimensions.length_mm,
      width_mm: dimensions.width_mm,
      height_mm: dimensions.height_mm,
      weight_kg: dimensions.weight_kg,
      model_id: generations.model_id,
      model_name: models.name,
      model_slug: models.slug,
      body_type: models.body_type,
      maker_name: makers.name,
    })
    .from(dimensions)
    .innerJoin(trims, eq(dimensions.trim_id, trims.id))
    .innerJoin(phases, eq(trims.phase_id, phases.id))
    .innerJoin(generations, eq(phases.generation_id, generations.id))
    .innerJoin(models, eq(generations.model_id, models.id))
    .innerJoin(makers, eq(models.maker_id, makers.id));
}

// ---------- All Trims with Dimensions ----------

/**
 * 指定モデルの全世代 → 全フェーズ → 全グレード → 寸法を一括取得する。
 * 世代選択・グレード選択UIに必要な全データを返す。
 */
export async function getAllTrimsWithDimensions(modelId: number) {
  return db
    .select({
      generationId: generations.id,
      generationName: generations.name,
      startYear: generations.start_year,
      endYear: generations.end_year,
      phaseId: phases.id,
      phaseName: phases.name,
      trimId: trims.id,
      trimName: trims.name,
      driveType: trims.drive_type,
      transmission: trims.transmission,
      dimensionId: dimensions.id,
      lengthMm: dimensions.length_mm,
      widthMm: dimensions.width_mm,
      heightMm: dimensions.height_mm,
      weightKg: dimensions.weight_kg,
      widthWithMirrorsMm: dimensions.width_with_mirrors_mm,
      minTurningRadiusM: dimensions.min_turning_radius_m,
    })
    .from(dimensions)
    .innerJoin(trims, eq(dimensions.trim_id, trims.id))
    .innerJoin(phases, eq(trims.phase_id, phases.id))
    .innerJoin(generations, eq(phases.generation_id, generations.id))
    .where(eq(generations.model_id, modelId));
}

// ---------- Parking Lots ----------

export async function getParkingLots() {
  return db.select().from(parkingLots);
}

export async function getParkingLotBySlug(slug: string) {
  const result = await db
    .select()
    .from(parkingLots)
    .where(eq(parkingLots.slug, slug))
    .limit(1);

  return result[0] ?? null;
}

export async function getParkingLotsByWard(ward: string) {
  return db
    .select()
    .from(parkingLots)
    .where(like(parkingLots.address, `%${ward}%`));
}

// ---------- Vehicle Restrictions ----------

export async function getRestrictionsByParkingLotId(parkingLotId: number) {
  return db
    .select()
    .from(vehicleRestrictions)
    .where(eq(vehicleRestrictions.parking_lot_id, parkingLotId));
}

export async function getAllRestrictions() {
  return db
    .select({
      id: vehicleRestrictions.id,
      parking_lot_id: vehicleRestrictions.parking_lot_id,
      restriction_name: vehicleRestrictions.restriction_name,
      max_length_mm: vehicleRestrictions.max_length_mm,
      max_width_mm: vehicleRestrictions.max_width_mm,
      max_height_mm: vehicleRestrictions.max_height_mm,
      max_weight_kg: vehicleRestrictions.max_weight_kg,
      spaces_count: vehicleRestrictions.spaces_count,
      monthly_fee_yen: vehicleRestrictions.monthly_fee_yen,
      notes: vehicleRestrictions.notes,
      parking_lot_name: parkingLots.name,
      parking_lot_slug: parkingLots.slug,
      parking_lot_address: parkingLots.address,
      parking_type: parkingLots.parking_type,
      latitude: parkingLots.latitude,
      longitude: parkingLots.longitude,
    })
    .from(vehicleRestrictions)
    .innerJoin(parkingLots, eq(vehicleRestrictions.parking_lot_id, parkingLots.id));
}

export async function getRestrictionsByWard(ward: string) {
  return db
    .select({
      id: vehicleRestrictions.id,
      parking_lot_id: vehicleRestrictions.parking_lot_id,
      restriction_name: vehicleRestrictions.restriction_name,
      max_length_mm: vehicleRestrictions.max_length_mm,
      max_width_mm: vehicleRestrictions.max_width_mm,
      max_height_mm: vehicleRestrictions.max_height_mm,
      max_weight_kg: vehicleRestrictions.max_weight_kg,
      spaces_count: vehicleRestrictions.spaces_count,
      monthly_fee_yen: vehicleRestrictions.monthly_fee_yen,
      notes: vehicleRestrictions.notes,
      parking_lot_name: parkingLots.name,
      parking_lot_slug: parkingLots.slug,
      parking_lot_address: parkingLots.address,
      parking_type: parkingLots.parking_type,
      latitude: parkingLots.latitude,
      longitude: parkingLots.longitude,
    })
    .from(vehicleRestrictions)
    .innerJoin(parkingLots, eq(vehicleRestrictions.parking_lot_id, parkingLots.id))
    .where(like(parkingLots.address, `%${ward}%`));
}

// ---------- Size Condition Queries ----------

/**
 * サイズ条件で駐車場を検索する。
 * vehicle_restrictionsの該当カラム >= 閾値でフィルタし、駐車場情報をJOIN。
 * JS側でparking_lot_idの重複排除を行う。
 */
export async function getParkingLotsBySizeCondition(
  dimension: "height" | "width" | "length",
  thresholdMm: number
) {
  const columnMap = {
    height: vehicleRestrictions.max_height_mm,
    width: vehicleRestrictions.max_width_mm,
    length: vehicleRestrictions.max_length_mm,
  } as const;

  const column = columnMap[dimension];

  const rows = await db
    .select({
      id: parkingLots.id,
      name: parkingLots.name,
      slug: parkingLots.slug,
      address: parkingLots.address,
      latitude: parkingLots.latitude,
      longitude: parkingLots.longitude,
      parking_type: parkingLots.parking_type,
      restriction_name: vehicleRestrictions.restriction_name,
      max_length_mm: vehicleRestrictions.max_length_mm,
      max_width_mm: vehicleRestrictions.max_width_mm,
      max_height_mm: vehicleRestrictions.max_height_mm,
      max_weight_kg: vehicleRestrictions.max_weight_kg,
    })
    .from(vehicleRestrictions)
    .innerJoin(parkingLots, eq(vehicleRestrictions.parking_lot_id, parkingLots.id))
    .where(gte(column, thresholdMm));

  // 駐車場ごとに重複排除（最初のrestrictionを代表値とする）
  const seen = new Set<number>();
  return rows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

/**
 * エリア+サイズ条件で駐車場を検索する。
 */
export async function getParkingLotsByWardAndSize(
  ward: string,
  dimension: "height" | "width" | "length",
  thresholdMm: number
) {
  const columnMap = {
    height: vehicleRestrictions.max_height_mm,
    width: vehicleRestrictions.max_width_mm,
    length: vehicleRestrictions.max_length_mm,
  } as const;

  const column = columnMap[dimension];

  const rows = await db
    .select({
      id: parkingLots.id,
      name: parkingLots.name,
      slug: parkingLots.slug,
      address: parkingLots.address,
      latitude: parkingLots.latitude,
      longitude: parkingLots.longitude,
      parking_type: parkingLots.parking_type,
      restriction_name: vehicleRestrictions.restriction_name,
      max_length_mm: vehicleRestrictions.max_length_mm,
      max_width_mm: vehicleRestrictions.max_width_mm,
      max_height_mm: vehicleRestrictions.max_height_mm,
      max_weight_kg: vehicleRestrictions.max_weight_kg,
    })
    .from(vehicleRestrictions)
    .innerJoin(parkingLots, eq(vehicleRestrictions.parking_lot_id, parkingLots.id))
    .where(and(like(parkingLots.address, `%${ward}%`), gte(column, thresholdMm)));

  const seen = new Set<number>();
  return rows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

/**
 * サイズ条件ごとの駐車場件数を一括取得する。
 */
export async function getSizeConditionCounts() {
  const conditions = [
    { dimension: "height" as const, column: vehicleRestrictions.max_height_mm },
    { dimension: "width" as const, column: vehicleRestrictions.max_width_mm },
    { dimension: "length" as const, column: vehicleRestrictions.max_length_mm },
  ];

  const thresholds = {
    height: [1550, 1800, 2000],
    width: [1850, 1900, 1950, 2050],
    length: [5000, 5300],
  };

  const counts: Record<string, number> = {};

  for (const { dimension, column } of conditions) {
    for (const threshold of thresholds[dimension]) {
      const rows = await db
        .select({ parking_lot_id: vehicleRestrictions.parking_lot_id })
        .from(vehicleRestrictions)
        .where(gte(column, threshold));

      const uniqueIds = new Set(rows.map((r) => r.parking_lot_id));
      counts[`${dimension}-${threshold}`] = uniqueIds.size;
    }
  }

  return counts;
}

// ---------- Maker helpers ----------

export async function getMakerBySlug(slug: string) {
  const result = await db
    .select()
    .from(makers)
    .where(eq(makers.slug, slug))
    .limit(1);

  return result[0] ?? null;
}

export async function getModelsByMakerSlug(makerSlug: string) {
  const rows = await db
    .select({
      id: models.id,
      name: models.name,
      slug: models.slug,
      body_type: models.body_type,
      image_url: models.image_url,
      maker_name: makers.name,
      maker_slug: makers.slug,
      length_mm: dimensions.length_mm,
      width_mm: dimensions.width_mm,
      height_mm: dimensions.height_mm,
      weight_kg: dimensions.weight_kg,
    })
    .from(models)
    .innerJoin(makers, eq(models.maker_id, makers.id))
    .leftJoin(generations, eq(generations.model_id, models.id))
    .leftJoin(phases, eq(phases.generation_id, generations.id))
    .leftJoin(trims, eq(trims.phase_id, phases.id))
    .leftJoin(dimensions, eq(dimensions.trim_id, trims.id))
    .where(eq(makers.slug, makerSlug))
    .orderBy(models.name, dimensions.id);

  // LEFT JOIN による行爆発をモデル単位で重複排除。
  // 寸法を持つ行を優先し、なければ寸法なしの行を採用する。
  const byModel = new Map<number, (typeof rows)[number]>();
  for (const row of rows) {
    const existing = byModel.get(row.id);
    if (!existing || (existing.length_mm == null && row.length_mm != null)) {
      byModel.set(row.id, row);
    }
  }
  return Array.from(byModel.values());
}

// ---------- Search helpers (lightweight for Combobox) ----------

export async function getModelsForSearch() {
  return db
    .select({
      slug: models.slug,
      name: models.name,
      makerName: makers.name,
    })
    .from(models)
    .innerJoin(makers, eq(models.maker_id, makers.id))
    .orderBy(makers.name, models.name);
}

export async function getParkingLotsForSearch() {
  return db
    .select({
      slug: parkingLots.slug,
      name: parkingLots.name,
      address: parkingLots.address,
    })
    .from(parkingLots)
    .orderBy(parkingLots.name);
}

export async function getRestrictionsByParkingLotSlug(slug: string) {
  return db
    .select({
      id: vehicleRestrictions.id,
      parking_lot_id: vehicleRestrictions.parking_lot_id,
      restriction_name: vehicleRestrictions.restriction_name,
      max_length_mm: vehicleRestrictions.max_length_mm,
      max_width_mm: vehicleRestrictions.max_width_mm,
      max_height_mm: vehicleRestrictions.max_height_mm,
      max_weight_kg: vehicleRestrictions.max_weight_kg,
      spaces_count: vehicleRestrictions.spaces_count,
      monthly_fee_yen: vehicleRestrictions.monthly_fee_yen,
      notes: vehicleRestrictions.notes,
    })
    .from(vehicleRestrictions)
    .innerJoin(parkingLots, eq(vehicleRestrictions.parking_lot_id, parkingLots.id))
    .where(eq(parkingLots.slug, slug));
}

// ---------- Parking Fees ----------

export async function getFeesByParkingLotId(parkingLotId: number) {
  return db
    .select()
    .from(parkingFees)
    .where(eq(parkingFees.parking_lot_id, parkingLotId));
}

// ---------- Operating Hours ----------

export async function getOperatingHoursByParkingLotId(parkingLotId: number) {
  return db
    .select()
    .from(operatingHours)
    .where(eq(operatingHours.parking_lot_id, parkingLotId))
    .orderBy(operatingHours.day_of_week);
}

// ---------- Related Items (SEO internal links) ----------

/** 同メーカーの他車種を取得（指定車種を除外） */
export async function getRelatedModelsByMaker(makerId: number, excludeModelId: number) {
  return db
    .select({
      id: models.id,
      name: models.name,
      slug: models.slug,
      body_type: models.body_type,
    })
    .from(models)
    .where(and(eq(models.maker_id, makerId), sql`${models.id} != ${excludeModelId}`))
    .limit(8);
}

/** 同エリア（区）の他駐車場を取得（指定駐車場を除外） */
export async function getRelatedParkingLotsByWard(ward: string, excludeId: number) {
  return db
    .select({
      id: parkingLots.id,
      name: parkingLots.name,
      slug: parkingLots.slug,
      address: parkingLots.address,
      parking_type: parkingLots.parking_type,
    })
    .from(parkingLots)
    .where(and(like(parkingLots.address, `%${ward}%`), sql`${parkingLots.id} != ${excludeId}`))
    .limit(8);
}

/** 指定座標の周辺駐車場を取得する */
export async function getNearbyParkingLots(lat: number, lng: number, radiusKm: number = 1.0) {
  // SQLiteでの距離計算（簡易版: 1度 = 111kmとして計算）
  const latDelta = radiusKm / 111.0;
  const lngDelta = radiusKm / (111.0 * Math.cos(lat * (Math.PI / 180)));

  return db
    .select({
      id: parkingLots.id,
      name: parkingLots.name,
      slug: parkingLots.slug,
      address: parkingLots.address,
      latitude: parkingLots.latitude,
      longitude: parkingLots.longitude,
      parking_type: parkingLots.parking_type,
    })
    .from(parkingLots)
    .where(
      and(
        sql`${parkingLots.latitude} BETWEEN ${lat - latDelta} AND ${lat + latDelta}`,
        sql`${parkingLots.longitude} BETWEEN ${lng - lngDelta} AND ${lng + lngDelta}`
      )
    )
    .limit(20);
}
