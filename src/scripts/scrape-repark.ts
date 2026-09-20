/**
 * 三井のリパーク駐車場スクレイピング → CSV出力
 *
 * 使い方: npx tsx src/scripts/scrape-repark.ts [--ward=CODE] [--limit=N] [--output=FILE]
 *
 * 東京23区のリパーク駐車場データ（寸法制限付き）を収集しCSVに出力する。
 * 各レコードにsource_urlを付与してトレーサビリティを確保。
 */

import { writeFileSync } from "fs";
import { extractTokyoParkingAddress, isCarParkingName } from "../lib/parking-data-quality";

const BASE_URL = "https://www.repark.jp";

// 東京23区のcityコード（リパーク）
const WARD_CODES: Record<string, { code: number; name: string; lat: number; lng: number }> = {
  chiyoda:    { code: 101, name: "東京都千代田区", lat: 35.6938, lng: 139.7535 },
  chuo:       { code: 102, name: "東京都中央区", lat: 35.6706, lng: 139.7721 },
  minato:     { code: 103, name: "東京都港区", lat: 35.6581, lng: 139.7514 },
  shinjuku:   { code: 104, name: "東京都新宿区", lat: 35.6938, lng: 139.7035 },
  bunkyo:     { code: 105, name: "東京都文京区", lat: 35.7081, lng: 139.7521 },
  taito:      { code: 106, name: "東京都台東区", lat: 35.7126, lng: 139.7802 },
  sumida:     { code: 107, name: "東京都墨田区", lat: 35.7107, lng: 139.8019 },
  koto:       { code: 108, name: "東京都江東区", lat: 35.6727, lng: 139.8171 },
  shinagawa:  { code: 109, name: "東京都品川区", lat: 35.6090, lng: 139.7302 },
  meguro:     { code: 110, name: "東京都目黒区", lat: 35.6413, lng: 139.6980 },
  ota:        { code: 111, name: "東京都大田区", lat: 35.5612, lng: 139.7162 },
  setagaya:   { code: 112, name: "東京都世田谷区", lat: 35.6461, lng: 139.6530 },
  shibuya:    { code: 113, name: "東京都渋谷区", lat: 35.6640, lng: 139.6982 },
  nakano:     { code: 114, name: "東京都中野区", lat: 35.7079, lng: 139.6638 },
  suginami:   { code: 115, name: "東京都杉並区", lat: 35.6994, lng: 139.6367 },
  toshima:    { code: 116, name: "東京都豊島区", lat: 35.7264, lng: 139.7161 },
  kita:       { code: 117, name: "東京都北区", lat: 35.7528, lng: 139.7339 },
  arakawa:    { code: 118, name: "東京都荒川区", lat: 35.7359, lng: 139.7835 },
  itabashi:   { code: 119, name: "東京都板橋区", lat: 35.7516, lng: 139.7092 },
  nerima:     { code: 120, name: "東京都練馬区", lat: 35.7355, lng: 139.6517 },
  adachi:     { code: 121, name: "東京都足立区", lat: 35.7753, lng: 139.8044 },
  katsushika: { code: 122, name: "東京都葛飾区", lat: 35.7435, lng: 139.8474 },
  edogawa:    { code: 123, name: "東京都江戸川区", lat: 35.7068, lng: 139.8682 },
};

interface ReparkParking {
  name: string;
  parkCode: string;
  address: string;
  latitude: number;
  longitude: number;
  totalSpaces: number;
  maxLength: number;  // mm
  maxWidth: number;   // mm
  maxHeight: number;  // mm
  maxWeight: number;  // kg
  parkingStyle: string; // ゲート式、フラップ式、ロックレス式
  is24h: boolean;
  openTime?: string;
  closeTime?: string;
  feeInfo: string;
  sourceUrl: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseMeters(text: string): number {
  const match = text.match(/([\d.]+)\s*m/);
  if (match) return Math.round(parseFloat(match[1]) * 1000);
  return 0;
}

function parseTons(text: string): number {
  const match = text.match(/([\d.]+)\s*t/);
  if (match) return Math.round(parseFloat(match[1]) * 1000);
  return 0;
}

/**
 * リパークの検索結果一覧から駐車場コードを取得
 * 1ページ目: freeword URLでアクセス（リダイレクトでmap.htmlへ）
 * 2ページ目以降: ajax.html エンドポイントを使用
 */
async function fetchParkingCodes(ward: { code: number; name: string; lat: number; lng: number }): Promise<string[]> {
  const codes = new Set<string>();
  const encodedWord = encodeURIComponent(ward.name);

  // 1ページ目: 通常のfreeword URLで取得
  const firstPageUrl = `${BASE_URL}/parking_user/time/freeword/?st=4&pref=13&city=${ward.code}&word=${encodedWord}`;
  console.log(`  一覧ページ取得中: p=1`);

  const firstRes = await fetch(firstPageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    redirect: "follow",
  });

  if (!firstRes.ok) {
    console.error(`  ⚠️ HTTP ${firstRes.status}`);
    return [];
  }

  const firstHtml = await firstRes.text();

  // 1ページ目の駐車場コード抽出
  const extractCodes = (html: string): string[] => {
    const parkPattern = /park=(REP\d+)/g;
    let match;
    const found: string[] = [];
    while ((match = parkPattern.exec(html)) !== null) {
      if (!codes.has(match[1]) && !found.includes(match[1])) {
        found.push(match[1]);
      }
    }
    return found;
  };

  const firstCodes = extractCodes(firstHtml);
  firstCodes.forEach((c) => codes.add(c));
  console.log(`  → ${firstCodes.length}件取得 (合計: ${codes.size}件)`);

  // ページ内に「次へ」や次ページリンクがあるか確認
  const hasMorePages = firstHtml.includes("nextPageURL") || firstHtml.includes("次へ");

  if (!hasMorePages || firstCodes.length === 0) return Array.from(codes);

  // リダイレクト後のURL（map.html）をリファラーとして使用
  const refererUrl = firstRes.url || firstPageUrl;
  const doubleEncodedWord = encodeURIComponent(encodedWord);

  // 2ページ目以降: ajax.htmlエンドポイント（データが取れなくなるまでループ）
  for (let page = 2; page <= 50; page++) {
    await sleep(2000 + Math.random() * 3000);

    const ajaxUrl = `${BASE_URL}/parking_user/time/ajax.html?p=${page}&pref=13&city=${ward.code}&lat=${ward.lat}&lon=${ward.lng}&st=4&plc=${doubleEncodedWord}&word=${doubleEncodedWord}`;
    console.log(`  一覧ページ取得中: p=${page}`);

    try {
      const res = await fetch(ajaxUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": refererUrl,
          "X-Requested-With": "XMLHttpRequest",
          "Accept": "text/html, */*; q=0.01",
        },
      });

      if (!res.ok) {
        console.error(`  ⚠️ HTTP ${res.status} (p=${page})`);
        break;
      }

      const html = await res.text();

      // エラーページやデータなしの場合は終了
      if (html.includes("システムエラー") || html.length < 100) {
        console.log(`  → 応答なし (終了)`);
        break;
      }

      const pageCodes = extractCodes(html);

      if (pageCodes.length === 0) {
        console.log(`  → 0件 (終了)`);
        break;
      }

      pageCodes.forEach((c) => codes.add(c));
      console.log(`  → ${pageCodes.length}件取得 (合計: ${codes.size}件)`);
    } catch (error) {
      console.error(`  ❌ p=${page}: ${(error as Error).message}`);
      break;
    }
  }

  return Array.from(codes);
}

/**
 * 駐車場詳細ページからデータを取得
 */
async function fetchParkingDetail(parkCode: string): Promise<ReparkParking | null> {
  const detailUrl = `${BASE_URL}/parking_user/time/result/detail/?park=${parkCode}&st=4&pref=13`;

  try {
    const res = await fetch(detailUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TomepitaBot/1.0; parking research)",
      },
    });

    if (!res.ok) {
      console.error(`  ⚠️ HTTP ${res.status}: ${parkCode}`);
      return null;
    }

    const html = await res.text();

    // 駐車場名（titleタグから取得し、サフィックスを削除）
    let name = "";
    const titleMatch = html.match(/<title>([^<]*)<\/title>/);
    if (titleMatch) {
      name = titleMatch[1]
        .replace(/[：:]時間貸し駐車場検索.*$/, "")
        .replace(/\s*[|｜].*$/, "")
        .replace(/三井のリパーク\s*/, "")
        .trim();
    }

    // 住所（東京都○○区○○の部分のみ抽出、余計な情報を除去）
    const address = extractTokyoParkingAddress(html);
    if (!isCarParkingName(name) || !address) {
      console.log(`  ⏭️  スキップ (乗用車対象外または住所未確認): ${parkCode}`);
      return null;
    }

    // 座標
    let latitude = 0;
    let longitude = 0;
    const latMatch = html.match(/latitude['":\s]+(3[56]\.\d+)/);
    const lngMatch = html.match(/longitude['":\s]+(13[89]\.\d+)/);
    if (latMatch) latitude = parseFloat(latMatch[1]);
    if (lngMatch) longitude = parseFloat(lngMatch[1]);

    // 座標のフォールバック
    if (!latitude) {
      const latMatch2 = html.match(/lat['"=:\s]+(3[56]\.\d+)/);
      if (latMatch2) latitude = parseFloat(latMatch2[1]);
    }
    if (!longitude) {
      const lngMatch2 = html.match(/(?:lng|lon)['"=:\s]+(13[89]\.\d+)/);
      if (lngMatch2) longitude = parseFloat(lngMatch2[1]);
    }

    // 台数
    const spacesMatch = html.match(/(\d+)\s*台/);
    const totalSpaces = spacesMatch ? parseInt(spacesMatch[1]) : 0;

    // 車両制限
    // パターン: 「高さ2m、長さ5m、幅1.9m、重量2t」
    let maxHeight = 0, maxLength = 0, maxWidth = 0, maxWeight = 0;

    const heightMatch = html.match(/高さ\s*([\d.]+)\s*m/);
    const lengthMatch = html.match(/長さ\s*([\d.]+)\s*m/);
    const widthMatch = html.match(/幅\s*([\d.]+)\s*m/);
    const weightMatch = html.match(/重量\s*([\d.]+)\s*t/);

    if (heightMatch) maxHeight = Math.round(parseFloat(heightMatch[1]) * 1000);
    if (lengthMatch) maxLength = Math.round(parseFloat(lengthMatch[1]) * 1000);
    if (widthMatch) maxWidth = Math.round(parseFloat(widthMatch[1]) * 1000);
    if (weightMatch) maxWeight = Math.round(parseFloat(weightMatch[1]) * 1000);

    // 駐車場タイプ
    let parkingStyle = "";
    if (html.includes("ゲート式")) parkingStyle = "ゲート式";
    else if (html.includes("フラップ式")) parkingStyle = "フラップ式";
    else if (html.includes("ロック")) parkingStyle = "ロックレス式";

    // 営業時間
    let is24h = false;
    let openTime: string | undefined;
    let closeTime: string | undefined;
    if (html.includes("24時間")) {
      is24h = true;
    }

    // 料金
    const feeMatch = html.match(/(\d+)分[\/]?(\d+)円/);
    const feeInfo = feeMatch ? `${feeMatch[1]}分${feeMatch[2]}円` : "";

    if (!name || maxLength === 0) {
      console.log(`  ⏭️  スキップ (データ不足): ${parkCode}`);
      return null;
    }

    return {
      name,
      parkCode,
      address,
      latitude,
      longitude,
      totalSpaces,
      maxLength,
      maxWidth,
      maxHeight,
      maxWeight,
      parkingStyle,
      is24h,
      openTime,
      closeTime,
      feeInfo,
      sourceUrl: detailUrl,
    };
  } catch (error) {
    console.error(`  ❌ エラー: ${parkCode} - ${(error as Error).message}`);
    return null;
  }
}

/**
 * 寸法制限から駐車場タイプを推定
 */
function estimateParkingType(parking: ReparkParking): string {
  // リパークの種類情報とサイズから推定
  if (parking.parkingStyle === "ゲート式") {
    return parking.maxHeight <= 2000 ? "self_propelled" : "self_propelled";
  }
  // フラップ式・ロックレス式 = 平面
  if (parking.parkingStyle === "フラップ式" || parking.parkingStyle === "ロックレス式") {
    return "flat";
  }
  // サイズから推定
  if (parking.maxHeight <= 1550) return "mechanical";
  if (parking.maxHeight <= 2000) return "tower";
  return "flat";
}

function estimateRestrictionName(height: number): string {
  if (height <= 1550) return "普通車";
  if (height <= 2000) return "ハイルーフ";
  return "一般";
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsvRow(parking: ReparkParking): string {
  const slug = `repark-${parking.parkCode.toLowerCase()}`;
  const parkingType = estimateParkingType(parking);
  const restrictionName = estimateRestrictionName(parking.maxHeight);
  const feeMatch = parking.feeInfo.match(/(\d+)分(\d+)円/);
  const durationMinutes = feeMatch ? feeMatch[1] : "";
  const amountYen = feeMatch ? feeMatch[2] : "";

  return [
    escapeCsvField(parking.name),
    slug,
    escapeCsvField(parking.address),
    parking.latitude.toString(),
    parking.longitude.toString(),
    parkingType,
    parking.totalSpaces.toString(),
    parking.is24h ? "TRUE" : "FALSE",
    parking.openTime || "",
    parking.closeTime || "",
    "hourly",
    amountYen,
    durationMinutes,
    "",
    restrictionName,
    parking.maxLength.toString(),
    parking.maxWidth.toString(),
    parking.maxHeight.toString(),
    parking.maxWeight.toString(),
    parking.totalSpaces.toString(),
    "",
    parking.sourceUrl,
  ].join(",");
}

const CSV_HEADER =
  "name,slug,address,latitude,longitude,parking_type,total_spaces,is_24h,open_time,close_time,fee_type,amount_yen,duration_minutes,fee_notes,restriction_name,max_length_mm,max_width_mm,max_height_mm,max_weight_kg,spaces_count,restriction_notes,source_url";

async function main() {
  const args = process.argv.slice(2);
  const wardArg = args.find((a) => a.startsWith("--ward="))?.split("=")[1];
  const limitArg = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] || "0");
  const outputArg = args.find((a) => a.startsWith("--output="))?.split("=")[1] || "data/repark-parking.csv";

  const targetWards = wardArg
    ? { [wardArg]: WARD_CODES[wardArg] }
    : WARD_CODES;

  if (wardArg && !WARD_CODES[wardArg]) {
    console.error(`不明な区: ${wardArg}`);
    console.error(`有効な値: ${Object.keys(WARD_CODES).join(", ")}`);
    process.exit(1);
  }

  console.log(`🅿️  リパーク駐車場スクレイピング開始`);
  console.log(`対象区: ${Object.keys(targetWards).join(", ")}`);
  if (limitArg) console.log(`制限: ${limitArg}件`);
  console.log("");

  const allParkings: ReparkParking[] = [];

  for (const [ward, info] of Object.entries(targetWards)) {
    console.log(`📍 ${info.name} (city=${info.code}):`);

    const codes = await fetchParkingCodes(info);
    console.log(`  詳細ページ: ${codes.length}件`);

    for (const code of codes) {
      if (limitArg && allParkings.length >= limitArg) break;

      await sleep(2000 + Math.random() * 3000);
      const parking = await fetchParkingDetail(code);

      if (parking) {
        allParkings.push(parking);
        console.log(`  ✅ ${parking.name} (${parking.maxLength}x${parking.maxWidth}x${parking.maxHeight}mm) [${parking.parkingStyle}]`);
      }
    }

    if (limitArg && allParkings.length >= limitArg) break;

    // 区間のインターバル
    await sleep(5000);
  }

  // CSV出力
  const csvLines = [CSV_HEADER, ...allParkings.map(toCsvRow)];
  writeFileSync(outputArg, csvLines.join("\n"), "utf-8");

  console.log(`\n🎉 完了! ${allParkings.length}件 → ${outputArg}`);
}

main().catch((error) => {
  console.error("エラー:", error);
  process.exit(1);
});
