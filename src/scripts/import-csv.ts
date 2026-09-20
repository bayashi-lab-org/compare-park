import { parseCsvFile } from "./csv-parser";
import { validateParkingLots } from "./csv-validator";
import {
  parkingLots,
  vehicleRestrictions,
  parkingFees,
  operatingHours,
} from "../db/schema";
import { eq } from "drizzle-orm";
import type { ParsedParkingLot } from "./csv-parser";

async function getExistingSlugs(): Promise<Set<string>> {
  const { db } = await import("../db");
  const rows = await db
    .select({ slug: parkingLots.slug })
    .from(parkingLots)
    .all();
  return new Set(rows.map((r) => r.slug));
}

async function deleteParkingLot(slug: string) {
  const { db } = await import("../db");
  const lot = await db
    .select({ id: parkingLots.id })
    .from(parkingLots)
    .where(eq(parkingLots.slug, slug))
    .get();

  if (lot) {
    await db.delete(operatingHours).where(eq(operatingHours.parking_lot_id, lot.id)).run();
    await db.delete(parkingFees).where(eq(parkingFees.parking_lot_id, lot.id)).run();
    await db.delete(vehicleRestrictions).where(eq(vehicleRestrictions.parking_lot_id, lot.id)).run();
    await db.delete(parkingLots).where(eq(parkingLots.id, lot.id)).run();
  }
}

async function insertParkingLot(parking: ParsedParkingLot) {
  const { db } = await import("../db");
  const lot = await db
    .insert(parkingLots)
    .values({
      name: parking.name,
      slug: parking.slug,
      address: parking.address,
      latitude: parking.latitude,
      longitude: parking.longitude,
      parking_type: parking.parkingType,
      total_spaces: parking.totalSpaces,
      facility_type: parking.facilityType as typeof parkingLots.$inferInsert.facility_type,
      source_url: parking.sourceUrl,
    })
    .returning({ id: parkingLots.id })
    .get();

  // vehicle_restrictions
  for (const r of parking.restrictions) {
    await db
      .insert(vehicleRestrictions)
      .values({
        parking_lot_id: lot.id,
        restriction_name: r.name,
        max_length_mm: r.maxLengthMm,
        max_width_mm: r.maxWidthMm,
        max_height_mm: r.maxHeightMm,
        max_weight_kg: r.maxWeightKg,
        spaces_count: r.spacesCount,
        notes: r.notes,
      })
      .run();
  }

  // parking_fees
  for (const f of parking.fees) {
    await db
      .insert(parkingFees)
      .values({
        parking_lot_id: lot.id,
        fee_type: f.feeType,
        amount_yen: f.amountYen,
        duration_minutes: f.durationMinutes,
        notes: f.notes,
      })
      .run();
  }

  // operating_hours (全曜日分)
  for (let day = 0; day <= 6; day++) {
    await db
      .insert(operatingHours)
      .values({
        parking_lot_id: lot.id,
        day_of_week: day,
        is_24h: parking.is24h,
        open_time: parking.is24h ? undefined : parking.openTime,
        close_time: parking.is24h ? undefined : parking.closeTime,
      })
      .run();
  }

  return lot.id;
}

async function main() {
  const args = process.argv.slice(2);
  const csvPath = args.find((a) => !a.startsWith("--"));
  const isDryRun = args.includes("--dry-run");
  const isUpdate = args.includes("--update");

  if (!csvPath) {
    console.error("使い方: npx tsx src/scripts/import-csv.ts <CSVファイルパス> [--dry-run] [--update]");
    console.error("");
    console.error("オプション:");
    console.error("  --dry-run  検証のみ（DB投入なし）");
    console.error("  --update   既存slugの駐車場を上書き更新");
    process.exit(1);
  }

  console.log(`📂 CSVファイル: ${csvPath}`);
  console.log(`モード: ${isDryRun ? "🔍 検証のみ (dry-run)" : isUpdate ? "🔄 更新モード" : "➕ 新規追加モード"}`);
  console.log("");

  // CSV解析
  let lots: ParsedParkingLot[];
  try {
    lots = parseCsvFile(csvPath);
    console.log(`✅ CSV解析完了: ${lots.length}件の駐車場`);
  } catch (e) {
    console.error(`❌ CSV解析エラー: ${(e as Error).message}`);
    process.exit(1);
  }

  // 既存slug取得
  const existingSlugs = isDryRun ? new Set<string>() : await getExistingSlugs();
  if (!isDryRun) console.log(`📊 DB内既存駐車場: ${existingSlugs.size}件`);

  // バリデーション（既存slugチェックは投入時のスキップに任せる）
  const errors = validateParkingLots(lots);

  if (errors.length > 0) {
    console.error(`\n❌ バリデーションエラー: ${errors.length}件`);
    for (const e of errors) {
      console.error(`  - [${e.lot}] ${e.field}: ${e.message}`);
    }
    if (!isDryRun) {
      console.error("\nエラーを修正してください。DB投入は中止されました。");
      process.exit(1);
    }
    process.exitCode = 1;
  } else {
    console.log("✅ バリデーション通過");
  }

  // 統計
  const totalRestrictions = lots.reduce((sum, l) => sum + l.restrictions.length, 0);
  const totalFees = lots.reduce((sum, l) => sum + l.fees.length, 0);
  const newCount = lots.filter((l) => !existingSlugs.has(l.slug)).length;
  const updateCount = lots.filter((l) => existingSlugs.has(l.slug)).length;

  console.log(`\n📊 投入予定:`);
  console.log(isDryRun
    ? `  駐車場: ${lots.length}件（DB未照合。新規・既存の内訳は未確認）`
    : `  駐車場: ${lots.length}件 (新規: ${newCount}, 既存: ${updateCount})`);
  console.log(`  制限パターン: ${totalRestrictions}件`);
  console.log(`  料金: ${totalFees}件`);

  if (isDryRun) {
    console.log("\n🔍 dry-runモードのため、DB投入はスキップします。");
    return;
  }

  // DB投入
  console.log("\n🚀 DB投入を開始...");
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const lot of lots) {
    const exists = existingSlugs.has(lot.slug);

    if (exists && !isUpdate) {
      console.log(`  ⏭️  スキップ: ${lot.name} (${lot.slug}) — 既存`);
      skipped++;
      continue;
    }

    if (exists && isUpdate) {
      await deleteParkingLot(lot.slug);
      await insertParkingLot(lot);
      console.log(`  🔄 更新: ${lot.name} (${lot.slug})`);
      updated++;
    } else {
      await insertParkingLot(lot);
      console.log(`  ✅ 追加: ${lot.name} (${lot.slug})`);
      inserted++;
    }
  }

  console.log(`\n🎉 完了! 追加: ${inserted}件, 更新: ${updated}件, スキップ: ${skipped}件`);
}

main().catch((error) => {
  console.error("エラー:", error);
  process.exit(1);
});
