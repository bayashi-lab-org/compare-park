import { db } from "../index";
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
} from "../schema";
import { sql } from "drizzle-orm";

// ============================================================
// 車種データ定義
// ============================================================
interface CarSeed {
  makerName: string;
  makerSlug: string;
  country: string;
  modelName: string;
  modelSlug: string;
  bodyType: "sedan" | "suv" | "minivan" | "compact" | "wagon" | "coupe" | "truck";
  generationName: string;
  startYear: number;
  endYear?: number;
  trimName: string;
  driveType: "2WD" | "4WD" | "AWD";
  transmission: string;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  weightKg: number;
  minTurningRadiusM: number;
  existingModel?: boolean;
}

// ヘルパー: 同一モデルの追加トリム生成
function t(base: Partial<CarSeed>, overrides?: Partial<CarSeed>): CarSeed {
  return { ...base, existingModel: true, ...overrides } as CarSeed;
}

// --- トヨタ ベース定義 ---
const toyotaBase = { makerName: "トヨタ" as const, makerSlug: "toyota" as const, country: "日本" as const };

const alphard40Base = { ...toyotaBase, modelName: "アルファード", modelSlug: "alphard", bodyType: "minivan" as const, generationName: "40系 (2023-)", startYear: 2023 };
const alphard30Base = { ...toyotaBase, modelName: "アルファード", modelSlug: "alphard", bodyType: "minivan" as const, generationName: "30系後期 (2018-2022)", startYear: 2018, endYear: 2022 };
const voxy90Base = { ...toyotaBase, modelName: "ヴォクシー", modelSlug: "voxy", bodyType: "minivan" as const, generationName: "90系 (2022-)", startYear: 2022 };
const voxy80Base = { ...toyotaBase, modelName: "ヴォクシー", modelSlug: "voxy", bodyType: "minivan" as const, generationName: "80系後期 (2017-2021)", startYear: 2017, endYear: 2021 };
const harrier80Base = { ...toyotaBase, modelName: "ハリアー", modelSlug: "harrier", bodyType: "suv" as const, generationName: "80系 (2020-)", startYear: 2020 };
const harrier60Base = { ...toyotaBase, modelName: "ハリアー", modelSlug: "harrier", bodyType: "suv" as const, generationName: "60系 (2013-2020)", startYear: 2013, endYear: 2020 };
const rav4Base = { ...toyotaBase, modelName: "RAV4", modelSlug: "rav4", bodyType: "suv" as const, generationName: "5代目 (2019-)", startYear: 2019 };
const yarisBase = { ...toyotaBase, modelName: "ヤリス", modelSlug: "yaris", bodyType: "compact" as const, generationName: "初代 (2020-)", startYear: 2020 };
const yarisCrossBase = { ...toyotaBase, modelName: "ヤリスクロス", modelSlug: "yaris-cross", bodyType: "suv" as const, generationName: "初代 (2020-)", startYear: 2020 };
const prius60Base = { ...toyotaBase, modelName: "プリウス", modelSlug: "prius", bodyType: "sedan" as const, generationName: "60系 5代目 (2023-)", startYear: 2023 };
const prius50Base = { ...toyotaBase, modelName: "プリウス", modelSlug: "prius", bodyType: "sedan" as const, generationName: "50系 4代目 (2015-2022)", startYear: 2015, endYear: 2022 };
const lc300Base = { ...toyotaBase, modelName: "ランドクルーザー300", modelSlug: "land-cruiser-300", bodyType: "suv" as const, generationName: "300系 (2021-)", startYear: 2021 };

// --- ホンダ ベース定義 ---
const hondaBase = { makerName: "ホンダ" as const, makerSlug: "honda" as const, country: "日本" as const };
const nbox3Base = { ...hondaBase, modelName: "N-BOX", modelSlug: "n-box", bodyType: "compact" as const, generationName: "3代目 JF5/JF6 (2023-)", startYear: 2023 };
const nbox2Base = { ...hondaBase, modelName: "N-BOX", modelSlug: "n-box", bodyType: "compact" as const, generationName: "2代目 JF3/JF4 (2017-2023)", startYear: 2017, endYear: 2023 };
const freed3Base = { ...hondaBase, modelName: "フリード", modelSlug: "freed", bodyType: "minivan" as const, generationName: "3代目 (2024-)", startYear: 2024 };
const freed2Base = { ...hondaBase, modelName: "フリード", modelSlug: "freed", bodyType: "minivan" as const, generationName: "2代目 GB5/6/7/8 (2016-2024)", startYear: 2016, endYear: 2024 };

// --- 日産 ベース定義 ---
const nissanBase = { makerName: "日産" as const, makerSlug: "nissan" as const, country: "日本" as const };
const serenaC28Base = { ...nissanBase, modelName: "セレナ", modelSlug: "serena", bodyType: "minivan" as const, generationName: "C28型 (2022-)", startYear: 2022 };
const serenaC27Base = { ...nissanBase, modelName: "セレナ", modelSlug: "serena", bodyType: "minivan" as const, generationName: "C27型 (2016-2022)", startYear: 2016, endYear: 2022 };

// --- マツダ ベース定義 ---
const mazdaBase = { makerName: "マツダ" as const, makerSlug: "mazda" as const, country: "日本" as const };
const cx5Base = { ...mazdaBase, modelName: "CX-5", modelSlug: "cx-5", bodyType: "suv" as const, generationName: "2代目 (2017-)", startYear: 2017 };
const cx60Base = { ...mazdaBase, modelName: "CX-60", modelSlug: "cx-60", bodyType: "suv" as const, generationName: "初代 (2022-)", startYear: 2022 };

// --- スバル ベース定義 ---
const subaruBase = { makerName: "スバル" as const, makerSlug: "subaru" as const, country: "日本" as const };
const forester6Base = { ...subaruBase, modelName: "フォレスター", modelSlug: "forester", bodyType: "suv" as const, generationName: "6代目 (2024-)", startYear: 2024 };
const forester5Base = { ...subaruBase, modelName: "フォレスター", modelSlug: "forester", bodyType: "suv" as const, generationName: "5代目 SK (2018-2024)", startYear: 2018, endYear: 2024 };

// --- レクサス ベース定義 ---
const lexusBase = { makerName: "レクサス" as const, makerSlug: "lexus" as const, country: "日本" as const };
const rx5Base = { ...lexusBase, modelName: "RX", modelSlug: "rx", bodyType: "suv" as const, generationName: "5代目 (2022-)", startYear: 2022 };
const rx4Base = { ...lexusBase, modelName: "RX", modelSlug: "rx", bodyType: "suv" as const, generationName: "4代目 (2015-2022)", startYear: 2015, endYear: 2022 };
const nx2Base = { ...lexusBase, modelName: "NX", modelSlug: "nx", bodyType: "suv" as const, generationName: "2代目 (2021-)", startYear: 2021 };
const nx1Base = { ...lexusBase, modelName: "NX", modelSlug: "nx", bodyType: "suv" as const, generationName: "初代 (2014-2021)", startYear: 2014, endYear: 2021 };

// --- BMW ベース定義 ---
const bmwBase = { makerName: "BMW" as const, makerSlug: "bmw" as const, country: "ドイツ" as const };
const x3g45Base = { ...bmwBase, modelName: "X3", modelSlug: "x3", bodyType: "suv" as const, generationName: "G45 (2024-)", startYear: 2024 };
const x3g01Base = { ...bmwBase, modelName: "X3", modelSlug: "x3", bodyType: "suv" as const, generationName: "G01 (2017-2024)", startYear: 2017, endYear: 2024 };
const series3Base = { ...bmwBase, modelName: "3シリーズ", modelSlug: "3-series", bodyType: "sedan" as const, generationName: "G20 (2019-)", startYear: 2019 };

// --- メルセデス・ベンツ ベース定義 ---
const mbBase = { makerName: "メルセデス・ベンツ" as const, makerSlug: "mercedes-benz" as const, country: "ドイツ" as const };
const glcX254Base = { ...mbBase, modelName: "GLC", modelSlug: "glc", bodyType: "suv" as const, generationName: "X254 (2022-)", startYear: 2022 };
const glcX253Base = { ...mbBase, modelName: "GLC", modelSlug: "glc", bodyType: "suv" as const, generationName: "X253 (2016-2022)", startYear: 2016, endYear: 2022 };

// --- アウディ ベース定義 ---
const audiBase = { makerName: "アウディ" as const, makerSlug: "audi" as const, country: "ドイツ" as const };
const q5Base = { ...audiBase, modelName: "Q5", modelSlug: "q5", bodyType: "suv" as const, generationName: "FY (2017-)", startYear: 2017 };

// --- ボルボ ベース定義 ---
const volvoBase = { makerName: "ボルボ" as const, makerSlug: "volvo" as const, country: "スウェーデン" as const };
const xc60Base = { ...volvoBase, modelName: "XC60", modelSlug: "xc60", bodyType: "suv" as const, generationName: "2代目 (2017-)", startYear: 2017 };

// --- トヨタ 追加モデル ベース定義 ---
const vellfire40Base = { ...toyotaBase, modelName: "ヴェルファイア", modelSlug: "vellfire", bodyType: "minivan" as const, generationName: "40系 (2023-)", startYear: 2023 };
const vellfire30Base = { ...toyotaBase, modelName: "ヴェルファイア", modelSlug: "vellfire", bodyType: "minivan" as const, generationName: "30系後期 (2018-2022)", startYear: 2018, endYear: 2022 };
const noah90Base = { ...toyotaBase, modelName: "ノア", modelSlug: "noah", bodyType: "minivan" as const, generationName: "90系 (2022-)", startYear: 2022 };
const sienta3Base = { ...toyotaBase, modelName: "シエンタ", modelSlug: "sienta", bodyType: "minivan" as const, generationName: "3代目 (2022-)", startYear: 2022 };
const crownSedanBase = { ...toyotaBase, modelName: "クラウン セダン", modelSlug: "crown-sedan", bodyType: "sedan" as const, generationName: "16代目 (2023-)", startYear: 2023 };
const crownSportBase = { ...toyotaBase, modelName: "クラウン スポーツ", modelSlug: "crown-sport", bodyType: "suv" as const, generationName: "初代 (2023-)", startYear: 2023 };
const crownCrossoverBase = { ...toyotaBase, modelName: "クラウン クロスオーバー", modelSlug: "crown-crossover", bodyType: "suv" as const, generationName: "初代 (2022-)", startYear: 2022 };
const bz4xBase = { ...toyotaBase, modelName: "bZ4X", modelSlug: "bz4x", bodyType: "suv" as const, generationName: "初代 (2022-)", startYear: 2022 };
const lc250Base = { ...toyotaBase, modelName: "ランドクルーザー250", modelSlug: "land-cruiser-250", bodyType: "suv" as const, generationName: "250系 (2024-)", startYear: 2024 };
const lcPrado150Base = { ...toyotaBase, modelName: "ランドクルーザープラド", modelSlug: "land-cruiser-prado", bodyType: "suv" as const, generationName: "150系後期 (2017-2024)", startYear: 2017, endYear: 2024 };

// --- ホンダ 追加モデル ベース定義 ---
const crvBase = { ...hondaBase, modelName: "CR-V", modelSlug: "cr-v", bodyType: "suv" as const, generationName: "6代目 (2024-)", startYear: 2024 };
const zrvBase = { ...hondaBase, modelName: "ZR-V", modelSlug: "zr-v", bodyType: "suv" as const, generationName: "初代 (2023-)", startYear: 2023 };
const stepwgnBase = { ...hondaBase, modelName: "ステップワゴン", modelSlug: "stepwgn", bodyType: "minivan" as const, generationName: "6代目 RP6/RP7/RP8 (2022-)", startYear: 2022 };
const odysseyBase = { ...hondaBase, modelName: "オデッセイ", modelSlug: "odyssey", bodyType: "minivan" as const, generationName: "5代目 RC系 (2023-)", startYear: 2023 };
const vezelBase = { ...hondaBase, modelName: "ヴェゼル", modelSlug: "vezel", bodyType: "suv" as const, generationName: "2代目 (2021-)", startYear: 2021 };
const wrvBase = { ...hondaBase, modelName: "WR-V", modelSlug: "wr-v", bodyType: "suv" as const, generationName: "初代 (2024-)", startYear: 2024 };

// --- 日産 追加モデル ベース定義 ---
const xtrailBase = { ...nissanBase, modelName: "エクストレイル", modelSlug: "x-trail", bodyType: "suv" as const, generationName: "T33型 4代目 (2022-)", startYear: 2022 };
const ariyaBase = { ...nissanBase, modelName: "アリア", modelSlug: "ariya", bodyType: "suv" as const, generationName: "初代 (2022-)", startYear: 2022 };
const kicksBase = { ...nissanBase, modelName: "キックス", modelSlug: "kicks", bodyType: "suv" as const, generationName: "P15 (2020-)", startYear: 2020 };
const sakuraBase = { ...nissanBase, modelName: "サクラ", modelSlug: "sakura", bodyType: "compact" as const, generationName: "初代 (2022-)", startYear: 2022 };

// --- マツダ 追加モデル ベース定義 ---
const cx80Base = { ...mazdaBase, modelName: "CX-80", modelSlug: "cx-80", bodyType: "suv" as const, generationName: "初代 (2024-)", startYear: 2024 };
const cx3Base = { ...mazdaBase, modelName: "CX-3", modelSlug: "cx-3", bodyType: "suv" as const, generationName: "DK系 (2015-)", startYear: 2015 };
const cx30Base = { ...mazdaBase, modelName: "CX-30", modelSlug: "cx-30", bodyType: "suv" as const, generationName: "DM系 (2019-)", startYear: 2019 };

// --- 三菱 ベース定義 ---
const mitsubishiBase = { makerName: "三菱" as const, makerSlug: "mitsubishi" as const, country: "日本" as const };
const delicaD5Base = { ...mitsubishiBase, modelName: "デリカD:5", modelSlug: "delica-d5", bodyType: "minivan" as const, generationName: "後期 (2019-)", startYear: 2019 };
const outlanderBase = { ...mitsubishiBase, modelName: "アウトランダー", modelSlug: "outlander", bodyType: "suv" as const, generationName: "4代目 GN系 (2021-)", startYear: 2021 };
const eclipseCrossBase = { ...mitsubishiBase, modelName: "エクリプス クロス", modelSlug: "eclipse-cross", bodyType: "suv" as const, generationName: "MC後 (2020-)", startYear: 2020 };

// --- スバル 追加モデル ベース定義 ---
const outbackBase = { ...subaruBase, modelName: "レガシィ アウトバック", modelSlug: "outback", bodyType: "wagon" as const, generationName: "6代目 BT系 (2021-)", startYear: 2021 };
const crosstrekBase = { ...subaruBase, modelName: "クロストレック", modelSlug: "crosstrek", bodyType: "suv" as const, generationName: "初代 GU系 (2022-)", startYear: 2022 };

// --- スズキ ベース定義 ---
const suzukiBase = { makerName: "スズキ" as const, makerSlug: "suzuki" as const, country: "日本" as const };
const jimnyBase = { ...suzukiBase, modelName: "ジムニー", modelSlug: "jimny", bodyType: "suv" as const, generationName: "4代目 JB64W (2018-)", startYear: 2018 };
const jimnySierraBase = { ...suzukiBase, modelName: "ジムニーシエラ", modelSlug: "jimny-sierra", bodyType: "suv" as const, generationName: "JB74W (2018-)", startYear: 2018 };
const solioBase = { ...suzukiBase, modelName: "ソリオ", modelSlug: "solio", bodyType: "compact" as const, generationName: "4代目 (2020-)", startYear: 2020 };

// --- ダイハツ ベース定義 ---
const daihatsuBase = { makerName: "ダイハツ" as const, makerSlug: "daihatsu" as const, country: "日本" as const };
const rockyBase = { ...daihatsuBase, modelName: "ロッキー", modelSlug: "rocky", bodyType: "suv" as const, generationName: "初代 (2019-)", startYear: 2019 };

// --- テスラ ベース定義 ---
const teslaBase = { makerName: "テスラ" as const, makerSlug: "tesla" as const, country: "アメリカ" as const };
const modelYBase = { ...teslaBase, modelName: "Model Y", modelSlug: "model-y", bodyType: "suv" as const, generationName: "初代 (2022-)", startYear: 2022 };
const model3Base = { ...teslaBase, modelName: "Model 3", modelSlug: "model-3", bodyType: "sedan" as const, generationName: "Highland (2024-)", startYear: 2024 };
const modelXBase = { ...teslaBase, modelName: "Model X", modelSlug: "model-x", bodyType: "suv" as const, generationName: "後期 (2022-)", startYear: 2022 };

// --- BMW 追加モデル ベース定義 ---
const x5Base = { ...bmwBase, modelName: "X5", modelSlug: "x5", bodyType: "suv" as const, generationName: "G05 (2019-)", startYear: 2019 };
const x7Base = { ...bmwBase, modelName: "X7", modelSlug: "x7", bodyType: "suv" as const, generationName: "G07 (2019-)", startYear: 2019 };

// --- メルセデス・ベンツ 追加モデル ベース定義 ---
const gClassBase = { ...mbBase, modelName: "Gクラス", modelSlug: "g-class", bodyType: "suv" as const, generationName: "W463A (2018-)", startYear: 2018 };
const glsBase = { ...mbBase, modelName: "GLS", modelSlug: "gls", bodyType: "suv" as const, generationName: "X167 (2020-)", startYear: 2020 };

// --- アウディ 追加モデル ベース定義 ---
const q3Base = { ...audiBase, modelName: "Q3", modelSlug: "q3", bodyType: "suv" as const, generationName: "F3 (2019-)", startYear: 2019 };
const q7Base = { ...audiBase, modelName: "Q7", modelSlug: "q7", bodyType: "suv" as const, generationName: "4M (2020-)", startYear: 2020 };

// --- ポルシェ ベース定義 ---
const porscheBase = { makerName: "ポルシェ" as const, makerSlug: "porsche" as const, country: "ドイツ" as const };
const cayenneBase = { ...porscheBase, modelName: "カイエン", modelSlug: "cayenne", bodyType: "suv" as const, generationName: "E3 (2018-)", startYear: 2018 };
const macanBase = { ...porscheBase, modelName: "マカン", modelSlug: "macan", bodyType: "suv" as const, generationName: "95B (2019-)", startYear: 2019 };

// --- ランボルギーニ ベース定義 ---
const lamborghiniBase = { makerName: "ランボルギーニ" as const, makerSlug: "lamborghini" as const, country: "イタリア" as const };
const urusBase = { ...lamborghiniBase, modelName: "ウルス", modelSlug: "urus", bodyType: "suv" as const, generationName: "初代 (2018-)", startYear: 2018 };

// --- ロールス・ロイス ベース定義 ---
const rollsRoyceBase = { makerName: "ロールス・ロイス" as const, makerSlug: "rolls-royce" as const, country: "イギリス" as const };
const cullinanBase = { ...rollsRoyceBase, modelName: "カリナン", modelSlug: "cullinan", bodyType: "suv" as const, generationName: "初代 (2018-)", startYear: 2018 };

// --- フェラーリ ベース定義 ---
const ferrariBase = { makerName: "フェラーリ" as const, makerSlug: "ferrari" as const, country: "イタリア" as const };
const purosangueBase = { ...ferrariBase, modelName: "プロサングエ", modelSlug: "purosangue", bodyType: "suv" as const, generationName: "初代 (2023-)", startYear: 2023 };

// --- ベントレー ベース定義 ---
const bentleyBase = { makerName: "ベントレー" as const, makerSlug: "bentley" as const, country: "イギリス" as const };
const bentaygaBase = { ...bentleyBase, modelName: "ベンテイガ", modelSlug: "bentayga", bodyType: "suv" as const, generationName: "後期 (2020-)", startYear: 2020 };
const bentaygaEwbBase = { ...bentleyBase, modelName: "ベンテイガ EWB", modelSlug: "bentayga-ewb", bodyType: "suv" as const, generationName: "初代 (2022-)", startYear: 2022 };
const bentayga1stBase = { ...bentleyBase, modelName: "ベンテイガ", modelSlug: "bentayga", bodyType: "suv" as const, generationName: "前期 (2016-2020)", startYear: 2016, endYear: 2020 };

// --- ランボルギーニ 追加モデル ベース定義 ---
const aventadorBase = { ...lamborghiniBase, modelName: "アヴェンタドール", modelSlug: "aventador", bodyType: "coupe" as const, generationName: "LP780-4 Ultimae (2021-2022)", startYear: 2021, endYear: 2022 };
const revueltoBase = { ...lamborghiniBase, modelName: "レヴエルト", modelSlug: "revuelto", bodyType: "coupe" as const, generationName: "初代 (2024-)", startYear: 2024 };
const huracanBase = { ...lamborghiniBase, modelName: "ウラカン", modelSlug: "huracan", bodyType: "coupe" as const, generationName: "EVO (2019-2024)", startYear: 2019, endYear: 2024 };
const temerarioBase = { ...lamborghiniBase, modelName: "テメラリオ", modelSlug: "temerario", bodyType: "coupe" as const, generationName: "初代 (2025-)", startYear: 2025 };

// --- ポルシェ 追加モデル ベース定義 ---
const porsche911Base = { ...porscheBase, modelName: "911", modelSlug: "911", bodyType: "coupe" as const, generationName: "992型 (2019-)", startYear: 2019 };

// --- フェラーリ 追加モデル ベース定義 ---
const ferrari458Base = { ...ferrariBase, modelName: "458イタリア", modelSlug: "458-italia", bodyType: "coupe" as const, generationName: "初代 (2009-2015)", startYear: 2009, endYear: 2015 };
const ferrari488Base = { ...ferrariBase, modelName: "488", modelSlug: "488", bodyType: "coupe" as const, generationName: "GTB/Spider (2015-2019)", startYear: 2015, endYear: 2019 };
const ferrariF8Base = { ...ferrariBase, modelName: "F8トリブート", modelSlug: "f8-tributo", bodyType: "coupe" as const, generationName: "初代 (2019-2024)", startYear: 2019, endYear: 2024 };
const ferrari296Base = { ...ferrariBase, modelName: "296 GTB", modelSlug: "296-gtb", bodyType: "coupe" as const, generationName: "初代 (2022-)", startYear: 2022 };
const ferrariRomaBase = { ...ferrariBase, modelName: "ローマ", modelSlug: "roma", bodyType: "coupe" as const, generationName: "初代 (2020-)", startYear: 2020 };
const ferrari12CilindriBase = { ...ferrariBase, modelName: "12チリンドリ", modelSlug: "12-cilindri", bodyType: "coupe" as const, generationName: "初代 (2024-)", startYear: 2024 };

// --- アストンマーティン ベース定義 ---
const astonMartinBase = { makerName: "アストンマーティン" as const, makerSlug: "aston-martin" as const, country: "イギリス" as const };
const dbxBase = { ...astonMartinBase, modelName: "DBX", modelSlug: "dbx", bodyType: "suv" as const, generationName: "初代 (2020-)", startYear: 2020 };

// --- ランドローバー ベース定義 ---
const landRoverBase = { makerName: "ランドローバー" as const, makerSlug: "land-rover" as const, country: "イギリス" as const };
const rangeRoverBase = { ...landRoverBase, modelName: "レンジローバー", modelSlug: "range-rover", bodyType: "suv" as const, generationName: "5代目 L460 (2022-)", startYear: 2022 };
const defenderBase = { ...landRoverBase, modelName: "ディフェンダー", modelSlug: "defender", bodyType: "suv" as const, generationName: "L663 (2020-)", startYear: 2020 };
const rangeRoverSportBase = { ...landRoverBase, modelName: "レンジローバースポーツ", modelSlug: "range-rover-sport", bodyType: "suv" as const, generationName: "3代目 (2022-)", startYear: 2022 };
const evoqueBase = { ...landRoverBase, modelName: "レンジローバーイヴォーク", modelSlug: "range-rover-evoque", bodyType: "suv" as const, generationName: "2代目 (2019-)", startYear: 2019 };
const velarBase = { ...landRoverBase, modelName: "レンジローバーヴェラール", modelSlug: "range-rover-velar", bodyType: "suv" as const, generationName: "初代 (2017-)", startYear: 2017 };

// --- Jeep ベース定義 ---
const jeepBase = { makerName: "Jeep" as const, makerSlug: "jeep" as const, country: "アメリカ" as const };
const wranglerBase = { ...jeepBase, modelName: "ラングラー", modelSlug: "wrangler", bodyType: "suv" as const, generationName: "JL (2018-)", startYear: 2018 };
const grandCherokeeBase = { ...jeepBase, modelName: "グランドチェロキー", modelSlug: "grand-cherokee", bodyType: "suv" as const, generationName: "WL (2022-)", startYear: 2022 };
const grandCherokeeLBase = { ...jeepBase, modelName: "グランドチェロキーL", modelSlug: "grand-cherokee-l", bodyType: "suv" as const, generationName: "WL (2021-)", startYear: 2021 };

// --- ボルボ 追加モデル ベース定義 ---
const xc90Base = { ...volvoBase, modelName: "XC90", modelSlug: "xc90", bodyType: "suv" as const, generationName: "2代目 (2015-)", startYear: 2015 };

// --- レクサス 追加モデル ベース定義 ---
const uxBase = { ...lexusBase, modelName: "UX", modelSlug: "ux", bodyType: "suv" as const, generationName: "初代 (2018-)", startYear: 2018 };
const lxBase = { ...lexusBase, modelName: "LX", modelSlug: "lx", bodyType: "suv" as const, generationName: "600 (2022-)", startYear: 2022 };
const lmBase = { ...lexusBase, modelName: "LM", modelSlug: "lm", bodyType: "minivan" as const, generationName: "2代目 (2023-)", startYear: 2023 };
const lbxBase = { ...lexusBase, modelName: "LBX", modelSlug: "lbx", bodyType: "suv" as const, generationName: "初代 (2023-)", startYear: 2023 };
const gxBase = { ...lexusBase, modelName: "GX", modelSlug: "gx", bodyType: "suv" as const, generationName: "3代目 (2024-)", startYear: 2024 };
const rzBase = { ...lexusBase, modelName: "RZ", modelSlug: "rz", bodyType: "suv" as const, generationName: "初代 (2023-)", startYear: 2023 };
const is500Base = { ...lexusBase, modelName: "IS 500", modelSlug: "is-500", bodyType: "sedan" as const, generationName: "3代目後期 (2022-)", startYear: 2022 };

// --- 日産 追加モデル ベース定義 ---
const gtrBase = { ...nissanBase, modelName: "GT-R", modelSlug: "gt-r", bodyType: "coupe" as const, generationName: "R35 (2007-2024)", startYear: 2007, endYear: 2024 };
const silviaBase = { ...nissanBase, modelName: "シルビア", modelSlug: "silvia", bodyType: "coupe" as const, generationName: "S15 (1999-2002)", startYear: 1999, endYear: 2002 };

// --- トヨタ 追加モデル ベース定義 ---
const centuryBase = { ...toyotaBase, modelName: "センチュリー", modelSlug: "century", bodyType: "suv" as const, generationName: "SUV (2023-)", startYear: 2023 };
const hiluxBase = { ...toyotaBase, modelName: "ハイラックス", modelSlug: "hilux", bodyType: "truck" as const, generationName: "8代目 (2017-)", startYear: 2017 };
const supraBase = { ...toyotaBase, modelName: "スープラ", modelSlug: "supra", bodyType: "coupe" as const, generationName: "A90 (2019-)", startYear: 2019 };

// --- 三菱 追加モデル ベース定義 ---
const delicaMiniBase = { ...mitsubishiBase, modelName: "デリカミニ", modelSlug: "delica-mini", bodyType: "compact" as const, generationName: "初代 (2023-)", startYear: 2023 };

// --- スズキ 追加モデル ベース定義 ---
const fronxBase = { ...suzukiBase, modelName: "フロンクス", modelSlug: "fronx", bodyType: "suv" as const, generationName: "初代 (2024-)", startYear: 2024 };

// --- ホンダ 追加モデル ベース定義 ---
const s2000Base = { ...hondaBase, modelName: "S2000", modelSlug: "s2000", bodyType: "coupe" as const, generationName: "AP1/AP2 (1999-2009)", startYear: 1999, endYear: 2009 };

// --- メルセデス・ベンツ 追加モデル ベース定義 ---
const sClassBase = { ...mbBase, modelName: "Sクラス", modelSlug: "s-class", bodyType: "sedan" as const, generationName: "W223 (2021-)", startYear: 2021 };
const cClassBase = { ...mbBase, modelName: "Cクラス", modelSlug: "c-class", bodyType: "sedan" as const, generationName: "W206 (2021-)", startYear: 2021 };
const vClassBase = { ...mbBase, modelName: "Vクラス", modelSlug: "v-class", bodyType: "minivan" as const, generationName: "W447後期 (2019-)", startYear: 2019 };
const amgGtBase = { ...mbBase, modelName: "AMG GT", modelSlug: "amg-gt", bodyType: "coupe" as const, generationName: "2代目 (2024-)", startYear: 2024 };

// --- BMW 追加モデル ベース定義 ---
const i8Base = { ...bmwBase, modelName: "i8", modelSlug: "i8", bodyType: "coupe" as const, generationName: "初代 (2014-2020)", startYear: 2014, endYear: 2020 };
const m3Base = { ...bmwBase, modelName: "M3", modelSlug: "m3", bodyType: "sedan" as const, generationName: "G80 (2021-)", startYear: 2021 };

// --- ポルシェ 追加モデル ベース定義 ---
const taycanBase = { ...porscheBase, modelName: "タイカン", modelSlug: "taycan", bodyType: "sedan" as const, generationName: "初代 (2020-)", startYear: 2020 };

// --- アウディ 追加モデル ベース定義 ---
const a4Base = { ...audiBase, modelName: "A4", modelSlug: "a4", bodyType: "sedan" as const, generationName: "B9 (2016-)", startYear: 2016 };
const r8Base = { ...audiBase, modelName: "R8", modelSlug: "r8", bodyType: "coupe" as const, generationName: "2代目 (2016-2024)", startYear: 2016, endYear: 2024 };

// --- BYD ベース定義 ---
const bydBase = { makerName: "BYD" as const, makerSlug: "byd" as const, country: "中国" as const };
const atto3Base = { ...bydBase, modelName: "ATTO 3", modelSlug: "atto-3", bodyType: "suv" as const, generationName: "初代 (2023-)", startYear: 2023 };
const dolphinBase = { ...bydBase, modelName: "ドルフィン", modelSlug: "dolphin", bodyType: "compact" as const, generationName: "初代 (2023-)", startYear: 2023 };
const sealBase = { ...bydBase, modelName: "シール", modelSlug: "seal", bodyType: "sedan" as const, generationName: "初代 (2024-)", startYear: 2024 };

// --- シボレー ベース定義 ---
const chevroletBase = { makerName: "シボレー" as const, makerSlug: "chevrolet" as const, country: "アメリカ" as const };
const corvetteBase = { ...chevroletBase, modelName: "コルベット", modelSlug: "corvette", bodyType: "coupe" as const, generationName: "C8 (2020-)", startYear: 2020 };

// --- フォルクスワーゲン ベース定義 ---
const vwBase = { makerName: "フォルクスワーゲン" as const, makerSlug: "volkswagen" as const, country: "ドイツ" as const };
const golfBase = { ...vwBase, modelName: "ゴルフ", modelSlug: "golf", bodyType: "compact" as const, generationName: "8代目 (2021-)", startYear: 2021 };
const tRocBase = { ...vwBase, modelName: "T-Roc", modelSlug: "t-roc", bodyType: "suv" as const, generationName: "初代 (2020-)", startYear: 2020 };
const id4Base = { ...vwBase, modelName: "ID.4", modelSlug: "id4", bodyType: "suv" as const, generationName: "初代 (2022-)", startYear: 2022 };

// --- マクラーレン ベース定義 ---
const mclarenBase = { makerName: "マクラーレン" as const, makerSlug: "mclaren" as const, country: "イギリス" as const };
const mclaren720sBase = { ...mclarenBase, modelName: "720S", modelSlug: "720s", bodyType: "coupe" as const, generationName: "初代 (2017-2024)", startYear: 2017, endYear: 2024 };

// --- ルノー ベース定義 ---
const renaultBase = { makerName: "ルノー" as const, makerSlug: "renault" as const, country: "フランス" as const };
const kangooBase = { ...renaultBase, modelName: "カングー", modelSlug: "kangoo", bodyType: "wagon" as const, generationName: "3代目 (2023-)", startYear: 2023 };

// --- フィアット ベース定義 ---
const fiatBase = { makerName: "フィアット" as const, makerSlug: "fiat" as const, country: "イタリア" as const };
const fiat500Base = { ...fiatBase, modelName: "500", modelSlug: "500", bodyType: "compact" as const, generationName: "2代目 (2008-)", startYear: 2008 };

// --- アバルト ベース定義 ---
const abarthBase = { makerName: "アバルト" as const, makerSlug: "abarth" as const, country: "イタリア" as const };
const abarth595Base = { ...abarthBase, modelName: "595", modelSlug: "595", bodyType: "compact" as const, generationName: "初代 (2013-)", startYear: 2013 };

// --- アルピーヌ ベース定義 ---
const alpineBase = { makerName: "アルピーヌ" as const, makerSlug: "alpine" as const, country: "フランス" as const };
const a110Base = { ...alpineBase, modelName: "A110", modelSlug: "a110", bodyType: "coupe" as const, generationName: "2代目 (2018-)", startYear: 2018 };

// --- ロータス ベース定義 ---
const lotusBase = { makerName: "ロータス" as const, makerSlug: "lotus" as const, country: "イギリス" as const };
const emiraBase = { ...lotusBase, modelName: "エミーラ", modelSlug: "emira", bodyType: "coupe" as const, generationName: "初代 (2023-)", startYear: 2023 };

// --- マセラティ ベース定義 ---
const maseratiBase = { makerName: "マセラティ" as const, makerSlug: "maserati" as const, country: "イタリア" as const };
const grecaleBase = { ...maseratiBase, modelName: "グレカーレ", modelSlug: "grecale", bodyType: "suv" as const, generationName: "初代 (2023-)", startYear: 2023 };

// --- ヒョンデ ベース定義 ---
const hyundaiBase = { makerName: "ヒョンデ" as const, makerSlug: "hyundai" as const, country: "韓国" as const };
const ioniq5Base = { ...hyundaiBase, modelName: "IONIQ 5", modelSlug: "ioniq-5", bodyType: "suv" as const, generationName: "初代 (2022-)", startYear: 2022 };

// --- ボルボ EX30 ベース定義 ---
const ex30Base = { ...volvoBase, modelName: "EX30", modelSlug: "ex30", bodyType: "suv" as const, generationName: "初代 (2024-)", startYear: 2024 };

// ============================================================
// 追加車種ベース定義 (2026-03 追加分)
// ============================================================

// --- トヨタ 追加モデル ---
const granaceBase = { ...toyotaBase, modelName: "グランエース", modelSlug: "granace", bodyType: "minivan" as const, generationName: "初代 (2019-2024)", startYear: 2019, endYear: 2024 };
const lc70Base = { ...toyotaBase, modelName: "ランドクルーザー70", modelSlug: "land-cruiser-70", bodyType: "suv" as const, generationName: "復刻版 (2023-)", startYear: 2023 };
const crownEstateBase = { ...toyotaBase, modelName: "クラウン エステート", modelSlug: "crown-estate", bodyType: "wagon" as const, generationName: "初代 (2025-)", startYear: 2025 };
const raizeBase = { ...toyotaBase, modelName: "ライズ", modelSlug: "raize", bodyType: "suv" as const, generationName: "初代 (2019-)", startYear: 2019 };
const roomyBase = { ...toyotaBase, modelName: "ルーミー", modelSlug: "roomy", bodyType: "compact" as const, generationName: "初代 (2016-)", startYear: 2016 };
const corollaBase = { ...toyotaBase, modelName: "カローラ", modelSlug: "corolla", bodyType: "sedan" as const, generationName: "12代目 E210 (2019-)", startYear: 2019 };
const corollaTouringBase = { ...toyotaBase, modelName: "カローラ ツーリング", modelSlug: "corolla-touring", bodyType: "wagon" as const, generationName: "初代 (2019-)", startYear: 2019 };
const corollaCrossBase = { ...toyotaBase, modelName: "カローラ クロス", modelSlug: "corolla-cross", bodyType: "suv" as const, generationName: "初代 (2021-)", startYear: 2021 };
const corollaSportBase = { ...toyotaBase, modelName: "カローラ スポーツ", modelSlug: "corolla-sport", bodyType: "compact" as const, generationName: "初代 (2018-)", startYear: 2018 };
const grYarisBase = { ...toyotaBase, modelName: "GRヤリス", modelSlug: "gr-yaris", bodyType: "compact" as const, generationName: "初代 (2020-)", startYear: 2020 };

// --- 日産 追加モデル ---
const elgrandBase = { ...nissanBase, modelName: "エルグランド", modelSlug: "elgrand", bodyType: "minivan" as const, generationName: "E52 (2010-)", startYear: 2010 };
const noteBase = { ...nissanBase, modelName: "ノート", modelSlug: "note", bodyType: "compact" as const, generationName: "E13 (2020-)", startYear: 2020 };
const noteAuraBase = { ...nissanBase, modelName: "ノート オーラ", modelSlug: "note-aura", bodyType: "compact" as const, generationName: "FE13 (2021-)", startYear: 2021 };
const rooxBase = { ...nissanBase, modelName: "ルークス", modelSlug: "roox", bodyType: "compact" as const, generationName: "B44A/B45A/B47A/B48A (2020-)", startYear: 2020 };

// --- ホンダ 追加モデル ---
const fitBase = { ...hondaBase, modelName: "フィット", modelSlug: "fit", bodyType: "compact" as const, generationName: "4代目 GR系 (2020-)", startYear: 2020 };
const civicBase = { ...hondaBase, modelName: "シビック", modelSlug: "civic", bodyType: "sedan" as const, generationName: "11代目 FL系 (2021-)", startYear: 2021 };
const civicTypeRBase = { ...hondaBase, modelName: "シビック タイプR", modelSlug: "civic-type-r", bodyType: "compact" as const, generationName: "FL5 (2022-)", startYear: 2022 };

// --- スバル 追加モデル ---
const levorgBase = { ...subaruBase, modelName: "レヴォーグ", modelSlug: "levorg", bodyType: "wagon" as const, generationName: "2代目 VN5 (2020-)", startYear: 2020 };
const levorgLaybackBase = { ...subaruBase, modelName: "レヴォーグ レイバック", modelSlug: "levorg-layback", bodyType: "suv" as const, generationName: "初代 (2023-)", startYear: 2023 };

// --- マツダ 追加モデル ---
const mazda2Base = { ...mazdaBase, modelName: "MAZDA2", modelSlug: "mazda2", bodyType: "compact" as const, generationName: "DJ系 (2014-)", startYear: 2014 };
const mazda3FbBase = { ...mazdaBase, modelName: "MAZDA3 ファストバック", modelSlug: "mazda3-fastback", bodyType: "compact" as const, generationName: "BP系 (2019-)", startYear: 2019 };
const mazda3SedanBase = { ...mazdaBase, modelName: "MAZDA3 セダン", modelSlug: "mazda3-sedan", bodyType: "sedan" as const, generationName: "BP系 (2019-)", startYear: 2019 };

// --- スズキ 追加モデル ---
const spaciaBase = { ...suzukiBase, modelName: "スペーシア", modelSlug: "spacia", bodyType: "compact" as const, generationName: "3代目 MK系 (2023-)", startYear: 2023 };
const hustlerBase = { ...suzukiBase, modelName: "ハスラー", modelSlug: "hustler", bodyType: "compact" as const, generationName: "2代目 MR系 (2020-)", startYear: 2020 };
const wagonRBase = { ...suzukiBase, modelName: "ワゴンR", modelSlug: "wagon-r", bodyType: "compact" as const, generationName: "6代目 MH系 (2017-)", startYear: 2017 };
const altoBase = { ...suzukiBase, modelName: "アルト", modelSlug: "alto", bodyType: "compact" as const, generationName: "9代目 HA37S/HA97S (2021-)", startYear: 2021 };

// --- ダイハツ 追加モデル ---
const tantoBase = { ...daihatsuBase, modelName: "タント", modelSlug: "tanto", bodyType: "compact" as const, generationName: "4代目 LA650S/LA660S (2019-)", startYear: 2019 };
const moveBase = { ...daihatsuBase, modelName: "ムーヴ", modelSlug: "move", bodyType: "compact" as const, generationName: "新型 (2025-)", startYear: 2025 };
const taftBase = { ...daihatsuBase, modelName: "タフト", modelSlug: "taft", bodyType: "compact" as const, generationName: "初代 LA900S/LA910S (2020-)", startYear: 2020 };

// --- メルセデス・ベンツ 追加モデル ---
const gleBase = { ...mbBase, modelName: "GLE", modelSlug: "gle", bodyType: "suv" as const, generationName: "W167 (2019-)", startYear: 2019 };
const gleCoupeBase = { ...mbBase, modelName: "GLE クーペ", modelSlug: "gle-coupe", bodyType: "suv" as const, generationName: "C167 (2020-)", startYear: 2020 };
const eqsSuvBase = { ...mbBase, modelName: "EQS SUV", modelSlug: "eqs-suv", bodyType: "suv" as const, generationName: "初代 (2023-)", startYear: 2023 };
const eqeSuvBase = { ...mbBase, modelName: "EQE SUV", modelSlug: "eqe-suv", bodyType: "suv" as const, generationName: "初代 (2024-)", startYear: 2024 };
const eClassBase = { ...mbBase, modelName: "Eクラス", modelSlug: "e-class", bodyType: "sedan" as const, generationName: "W214 (2024-)", startYear: 2024 };
const aClassBase = { ...mbBase, modelName: "Aクラス", modelSlug: "a-class", bodyType: "compact" as const, generationName: "W177 (2018-)", startYear: 2018 };
const bClassBase = { ...mbBase, modelName: "Bクラス", modelSlug: "b-class", bodyType: "compact" as const, generationName: "W247 (2019-)", startYear: 2019 };
const glaBase = { ...mbBase, modelName: "GLA", modelSlug: "gla", bodyType: "suv" as const, generationName: "H247 (2020-)", startYear: 2020 };
const glbBase = { ...mbBase, modelName: "GLB", modelSlug: "glb", bodyType: "suv" as const, generationName: "X247 (2020-)", startYear: 2020 };

// --- BMW 追加モデル ---
const bmw7Base = { ...bmwBase, modelName: "7シリーズ", modelSlug: "7-series", bodyType: "sedan" as const, generationName: "G70 (2022-)", startYear: 2022 };
const x6Base = { ...bmwBase, modelName: "X6", modelSlug: "x6", bodyType: "suv" as const, generationName: "G06 (2019-)", startYear: 2019 };
const ixBase = { ...bmwBase, modelName: "iX", modelSlug: "ix", bodyType: "suv" as const, generationName: "初代 (2022-)", startYear: 2022 };
const x1Base = { ...bmwBase, modelName: "X1", modelSlug: "x1", bodyType: "suv" as const, generationName: "U11 (2022-)", startYear: 2022 };
const bmw1Base = { ...bmwBase, modelName: "1シリーズ", modelSlug: "1-series", bodyType: "compact" as const, generationName: "F70 (2025-)", startYear: 2025 };
const bmw2gcBase = { ...bmwBase, modelName: "2シリーズ グランクーペ", modelSlug: "2-series-gran-coupe", bodyType: "sedan" as const, generationName: "F74 (2025-)", startYear: 2025 };
const bmw2atBase = { ...bmwBase, modelName: "2シリーズ アクティブツアラー", modelSlug: "2-series-active-tourer", bodyType: "minivan" as const, generationName: "U06 (2022-)", startYear: 2022 };

// --- アウディ 追加モデル ---
const q8Base = { ...audiBase, modelName: "Q8", modelSlug: "q8", bodyType: "suv" as const, generationName: "初代 (2019-)", startYear: 2019 };
const q8EtronBase = { ...audiBase, modelName: "Q8 e-tron", modelSlug: "q8-e-tron", bodyType: "suv" as const, generationName: "初代 (2023-)", startYear: 2023 };
const a8Base = { ...audiBase, modelName: "A8", modelSlug: "a8", bodyType: "sedan" as const, generationName: "D5 (2018-)", startYear: 2018 };
const etronGtBase = { ...audiBase, modelName: "e-tron GT", modelSlug: "e-tron-gt", bodyType: "sedan" as const, generationName: "初代 (2022-)", startYear: 2022 };
const a3Base = { ...audiBase, modelName: "A3", modelSlug: "a3", bodyType: "compact" as const, generationName: "8Y (2021-)", startYear: 2021 };

// --- キャデラック ベース定義 ---
const cadillacBase = { makerName: "キャデラック" as const, makerSlug: "cadillac" as const, country: "アメリカ" as const };
const escaladeBase = { ...cadillacBase, modelName: "エスカレード", modelSlug: "escalade", bodyType: "suv" as const, generationName: "5代目 (2021-)", startYear: 2021 };

// --- レクサス 追加モデル ---
const lsBase = { ...lexusBase, modelName: "LS", modelSlug: "ls", bodyType: "sedan" as const, generationName: "5代目 (2017-)", startYear: 2017 };
const esBase = { ...lexusBase, modelName: "ES", modelSlug: "es", bodyType: "sedan" as const, generationName: "7代目 AXZH10 (2018-)", startYear: 2018 };

// --- マセラティ 追加モデル ---
const levanteBase = { ...maseratiBase, modelName: "レヴァンテ", modelSlug: "levante", bodyType: "suv" as const, generationName: "初代 (2016-2024)", startYear: 2016, endYear: 2024 };

// --- ランボルギーニ 追加モデル ---
const urusSeBase = { ...lamborghiniBase, modelName: "ウルス SE", modelSlug: "urus-se", bodyType: "suv" as const, generationName: "SE (2024-)", startYear: 2024 };

// --- フォルクスワーゲン 追加モデル ---
const tiguanBase = { ...vwBase, modelName: "ティグアン", modelSlug: "tiguan", bodyType: "suv" as const, generationName: "3代目 (2024-)", startYear: 2024 };
const poloBase = { ...vwBase, modelName: "ポロ", modelSlug: "polo", bodyType: "compact" as const, generationName: "AW (2018-)", startYear: 2018 };
const tCrossBase = { ...vwBase, modelName: "T-Cross", modelSlug: "t-cross", bodyType: "suv" as const, generationName: "初代 (2019-)", startYear: 2019 };
const passatBase = { ...vwBase, modelName: "パサート", modelSlug: "passat", bodyType: "wagon" as const, generationName: "B9 (2024-)", startYear: 2024 };

// --- ボルボ 追加モデル ---
const xc40Base = { ...volvoBase, modelName: "XC40", modelSlug: "xc40", bodyType: "suv" as const, generationName: "初代 (2018-)", startYear: 2018 };
const v60Base = { ...volvoBase, modelName: "V60", modelSlug: "v60", bodyType: "wagon" as const, generationName: "2代目 (2018-)", startYear: 2018 };
const v60ccBase = { ...volvoBase, modelName: "V60 クロスカントリー", modelSlug: "v60-cross-country", bodyType: "wagon" as const, generationName: "2代目 (2019-)", startYear: 2019 };

// --- プジョー ベース定義 ---
const peugeotBase = { makerName: "プジョー" as const, makerSlug: "peugeot" as const, country: "フランス" as const };
const peugeot208Base = { ...peugeotBase, modelName: "208", modelSlug: "208", bodyType: "compact" as const, generationName: "2代目 (2020-)", startYear: 2020 };
const peugeot2008Base = { ...peugeotBase, modelName: "2008", modelSlug: "2008", bodyType: "suv" as const, generationName: "2代目 (2020-)", startYear: 2020 };
const peugeot308Base = { ...peugeotBase, modelName: "308", modelSlug: "308", bodyType: "compact" as const, generationName: "P5 (2022-)", startYear: 2022 };
const peugeot3008Base = { ...peugeotBase, modelName: "3008", modelSlug: "3008", bodyType: "suv" as const, generationName: "新型 (2025-)", startYear: 2025 };

// --- シトロエン ベース定義 ---
const citroenBase = { makerName: "シトロエン" as const, makerSlug: "citroen" as const, country: "フランス" as const };
const c3Base = { ...citroenBase, modelName: "C3", modelSlug: "c3", bodyType: "compact" as const, generationName: "新型 (2025-)", startYear: 2025 };

// --- ルノー 追加モデル ---
const luteciaBase = { ...renaultBase, modelName: "ルーテシア", modelSlug: "lutecia", bodyType: "compact" as const, generationName: "5代目 (2020-)", startYear: 2020 };
const capturBase = { ...renaultBase, modelName: "キャプチャー", modelSlug: "captur", bodyType: "suv" as const, generationName: "2代目 (2021-)", startYear: 2021 };
const arkanaBase = { ...renaultBase, modelName: "アルカナ", modelSlug: "arkana", bodyType: "suv" as const, generationName: "初代 (2022-)", startYear: 2022 };

// --- アルファロメオ ベース定義 ---
const alfaRomeoBase = { makerName: "アルファロメオ" as const, makerSlug: "alfa-romeo" as const, country: "イタリア" as const };
const tonaleBase = { ...alfaRomeoBase, modelName: "トナーレ", modelSlug: "tonale", bodyType: "suv" as const, generationName: "初代 (2023-)", startYear: 2023 };

// --- ヒョンデ 追加モデル ---
const konaBase = { ...hyundaiBase, modelName: "コナ", modelSlug: "kona", bodyType: "suv" as const, generationName: "2代目 (2023-)", startYear: 2023 };

// --- MINI ベース定義 ---
const miniBase = { makerName: "MINI" as const, makerSlug: "mini" as const, country: "イギリス" as const };
const mini3doorBase = { ...miniBase, modelName: "MINI 3ドア", modelSlug: "mini-3door", bodyType: "compact" as const, generationName: "F66 (2024-)", startYear: 2024 };
const mini5doorBase = { ...miniBase, modelName: "MINI 5ドア", modelSlug: "mini-5door", bodyType: "compact" as const, generationName: "F65 (2024-)", startYear: 2024 };
const miniCountrymanBase = { ...miniBase, modelName: "MINI カントリーマン", modelSlug: "mini-countryman", bodyType: "suv" as const, generationName: "U25 (2024-)", startYear: 2024 };

const carData: CarSeed[] = [
  // ============================================================
  // トヨタ アルファード 40系 (2023-) — 2026年6月仕様・標準装備。公式諸元: https://toyota.jp/pages/contents/alphard/004_p_001/pdf/alphard_spec_202606.pdf
  // ============================================================
  { ...alphard40Base, trimName: "Z 2.5L ガソリン", driveType: "2WD", transmission: "CVT", lengthMm: 4995, widthMm: 1850, heightMm: 1935, weightKg: 2060, minTurningRadiusM: 5.9 },
  t(alphard40Base, { trimName: "Z 2.5L ガソリン", driveType: "4WD", transmission: "CVT", lengthMm: 4995, widthMm: 1850, heightMm: 1935, weightKg: 2120, minTurningRadiusM: 5.9 }),
  t(alphard40Base, { trimName: "Executive Lounge 2.5L HV", driveType: "2WD", transmission: "CVT", lengthMm: 4995, widthMm: 1850, heightMm: 1935, weightKg: 2230, minTurningRadiusM: 5.9 }),
  t(alphard40Base, { trimName: "Executive Lounge 2.5L HV", driveType: "4WD", transmission: "CVT", lengthMm: 4995, widthMm: 1850, heightMm: 1935, weightKg: 2290, minTurningRadiusM: 5.9 }),
  t(alphard40Base, { trimName: "Z PHEV", driveType: "4WD", transmission: "CVT", lengthMm: 4995, widthMm: 1850, heightMm: 1945, weightKg: 2440, minTurningRadiusM: 5.9 }),

  // ============================================================
  // トヨタ アルファード 30系後期 (2018-2022)
  // ============================================================
  t(alphard30Base, { trimName: "S-C 2.5L", driveType: "2WD", transmission: "CVT", lengthMm: 4950, widthMm: 1850, heightMm: 1935, weightKg: 2010, minTurningRadiusM: 5.6 }),
  t(alphard30Base, { trimName: "S-C 2.5L", driveType: "4WD", transmission: "CVT", lengthMm: 4950, widthMm: 1850, heightMm: 1935, weightKg: 2070, minTurningRadiusM: 5.6 }),
  t(alphard30Base, { trimName: "Executive Lounge 3.5L", driveType: "2WD", transmission: "8AT", lengthMm: 4945, widthMm: 1850, heightMm: 1950, weightKg: 2100, minTurningRadiusM: 5.6 }),
  t(alphard30Base, { trimName: "Executive Lounge 3.5L", driveType: "4WD", transmission: "8AT", lengthMm: 4945, widthMm: 1850, heightMm: 1950, weightKg: 2170, minTurningRadiusM: 5.6 }),
  t(alphard30Base, { trimName: "S HV", driveType: "2WD", transmission: "CVT", lengthMm: 4950, widthMm: 1850, heightMm: 1935, weightKg: 2000, minTurningRadiusM: 5.6 }),
  t(alphard30Base, { trimName: "S HV", driveType: "4WD", transmission: "CVT", lengthMm: 4950, widthMm: 1850, heightMm: 1935, weightKg: 2060, minTurningRadiusM: 5.6 }),

  // ============================================================
  // トヨタ ヴォクシー 90系 (2022-)
  // ============================================================
  { ...voxy90Base, trimName: "S-G 2.0L", driveType: "2WD", transmission: "CVT", lengthMm: 4695, widthMm: 1730, heightMm: 1895, weightKg: 1610, minTurningRadiusM: 5.5 },
  t(voxy90Base, { trimName: "S-G 2.0L", driveType: "4WD", transmission: "CVT", lengthMm: 4695, widthMm: 1730, heightMm: 1895, weightKg: 1670, minTurningRadiusM: 5.5 }),
  t(voxy90Base, { trimName: "S-Z 2.0L", driveType: "2WD", transmission: "CVT", lengthMm: 4695, widthMm: 1730, heightMm: 1895, weightKg: 1640, minTurningRadiusM: 5.5 }),
  t(voxy90Base, { trimName: "S-Z HV", driveType: "2WD", transmission: "CVT", lengthMm: 4695, widthMm: 1730, heightMm: 1895, weightKg: 1690, minTurningRadiusM: 5.5 }),
  t(voxy90Base, { trimName: "S-Z HV", driveType: "4WD", transmission: "CVT", lengthMm: 4695, widthMm: 1730, heightMm: 1895, weightKg: 1740, minTurningRadiusM: 5.5 }),

  // ============================================================
  // トヨタ ヴォクシー 80系後期 (2017-2021)
  // ============================================================
  t(voxy80Base, { trimName: "ZS 2.0L", driveType: "2WD", transmission: "CVT", lengthMm: 4710, widthMm: 1735, heightMm: 1825, weightKg: 1570, minTurningRadiusM: 5.5 }),
  t(voxy80Base, { trimName: "ZS 2.0L", driveType: "4WD", transmission: "CVT", lengthMm: 4710, widthMm: 1735, heightMm: 1850, weightKg: 1620, minTurningRadiusM: 5.5 }),
  t(voxy80Base, { trimName: "ZS HV", driveType: "2WD", transmission: "CVT", lengthMm: 4710, widthMm: 1735, heightMm: 1825, weightKg: 1610, minTurningRadiusM: 5.5 }),

  // ============================================================
  // トヨタ ハリアー 80系 (2020-)
  // ============================================================
  { ...harrier80Base, trimName: "S 2.0L", driveType: "2WD", transmission: "CVT", lengthMm: 4740, widthMm: 1855, heightMm: 1660, weightKg: 1530, minTurningRadiusM: 5.5 },
  t(harrier80Base, { trimName: "G 2.0L", driveType: "2WD", transmission: "CVT", lengthMm: 4740, widthMm: 1855, heightMm: 1660, weightKg: 1570, minTurningRadiusM: 5.5 }),
  t(harrier80Base, { trimName: "G 2.0L", driveType: "4WD", transmission: "CVT", lengthMm: 4740, widthMm: 1855, heightMm: 1660, weightKg: 1640, minTurningRadiusM: 5.7 }),
  t(harrier80Base, { trimName: "Z 2.0L", driveType: "2WD", transmission: "CVT", lengthMm: 4740, widthMm: 1855, heightMm: 1660, weightKg: 1590, minTurningRadiusM: 5.5 }),
  t(harrier80Base, { trimName: "Z Leather Package 2.0L", driveType: "4WD", transmission: "CVT", lengthMm: 4740, widthMm: 1855, heightMm: 1660, weightKg: 1660, minTurningRadiusM: 5.7 }),
  t(harrier80Base, { trimName: "G HV", driveType: "2WD", transmission: "CVT", lengthMm: 4740, widthMm: 1855, heightMm: 1660, weightKg: 1620, minTurningRadiusM: 5.5 }),
  t(harrier80Base, { trimName: "G HV", driveType: "4WD", transmission: "CVT", lengthMm: 4740, widthMm: 1855, heightMm: 1660, weightKg: 1680, minTurningRadiusM: 5.5 }),
  t(harrier80Base, { trimName: "Z HV", driveType: "2WD", transmission: "CVT", lengthMm: 4740, widthMm: 1855, heightMm: 1660, weightKg: 1640, minTurningRadiusM: 5.5 }),
  t(harrier80Base, { trimName: "Z PHEV", driveType: "4WD", transmission: "CVT", lengthMm: 4740, widthMm: 1855, heightMm: 1660, weightKg: 1880, minTurningRadiusM: 5.5 }),

  // ============================================================
  // トヨタ ハリアー 60系 (2013-2020)
  // ============================================================
  t(harrier60Base, { trimName: "PREMIUM 2.0L", driveType: "2WD", transmission: "CVT", lengthMm: 4725, widthMm: 1835, heightMm: 1690, weightKg: 1580, minTurningRadiusM: 5.6 }),
  t(harrier60Base, { trimName: "PREMIUM 2.0L", driveType: "4WD", transmission: "CVT", lengthMm: 4725, widthMm: 1835, heightMm: 1690, weightKg: 1640, minTurningRadiusM: 5.6 }),

  // ============================================================
  // トヨタ RAV4 5代目 (2019-)
  // ============================================================
  { ...rav4Base, trimName: "X 2.0L", driveType: "2WD", transmission: "CVT", lengthMm: 4600, widthMm: 1855, heightMm: 1685, weightKg: 1500, minTurningRadiusM: 5.5 },
  t(rav4Base, { trimName: "G 2.0L", driveType: "4WD", transmission: "CVT", lengthMm: 4600, widthMm: 1855, heightMm: 1685, weightKg: 1570, minTurningRadiusM: 5.5 }),
  t(rav4Base, { trimName: "Adventure 2.0L", driveType: "4WD", transmission: "CVT", lengthMm: 4610, widthMm: 1865, heightMm: 1690, weightKg: 1630, minTurningRadiusM: 5.7 }),
  t(rav4Base, { trimName: "G HV", driveType: "2WD", transmission: "CVT", lengthMm: 4600, widthMm: 1855, heightMm: 1685, weightKg: 1590, minTurningRadiusM: 5.5 }),
  t(rav4Base, { trimName: "G HV", driveType: "4WD", transmission: "CVT", lengthMm: 4600, widthMm: 1855, heightMm: 1685, weightKg: 1640, minTurningRadiusM: 5.5 }),
  t(rav4Base, { trimName: "Adventure PHEV", driveType: "4WD", transmission: "CVT", lengthMm: 4600, widthMm: 1855, heightMm: 1695, weightKg: 1900, minTurningRadiusM: 5.5 }),

  // ============================================================
  // トヨタ ヤリス 初代 (2020-)
  // ============================================================
  { ...yarisBase, trimName: "X 1.0L", driveType: "2WD", transmission: "CVT", lengthMm: 3940, widthMm: 1695, heightMm: 1500, weightKg: 940, minTurningRadiusM: 4.8 },
  t(yarisBase, { trimName: "G 1.5L", driveType: "2WD", transmission: "CVT", lengthMm: 3940, widthMm: 1695, heightMm: 1500, weightKg: 1020, minTurningRadiusM: 4.8 }),
  t(yarisBase, { trimName: "G 1.5L", driveType: "4WD", transmission: "CVT", lengthMm: 3940, widthMm: 1695, heightMm: 1500, weightKg: 1060, minTurningRadiusM: 5.1 }),
  t(yarisBase, { trimName: "Z 1.5L", driveType: "2WD", transmission: "CVT", lengthMm: 3940, widthMm: 1695, heightMm: 1500, weightKg: 1050, minTurningRadiusM: 4.8 }),
  t(yarisBase, { trimName: "Z HV", driveType: "2WD", transmission: "CVT", lengthMm: 3940, widthMm: 1695, heightMm: 1500, weightKg: 1050, minTurningRadiusM: 5.1 }),
  t(yarisBase, { trimName: "Z HV", driveType: "4WD", transmission: "CVT", lengthMm: 3940, widthMm: 1695, heightMm: 1500, weightKg: 1110, minTurningRadiusM: 5.1 }),
  t(yarisBase, { trimName: "GR SPORT 1.5L", driveType: "2WD", transmission: "CVT", lengthMm: 3940, widthMm: 1695, heightMm: 1500, weightKg: 1040, minTurningRadiusM: 5.1 }),

  // ============================================================
  // トヨタ ヤリスクロス 初代 (2020-)
  // ============================================================
  { ...yarisCrossBase, trimName: "X 1.5L ガソリン", driveType: "2WD", transmission: "CVT", lengthMm: 4180, widthMm: 1765, heightMm: 1590, weightKg: 1110, minTurningRadiusM: 5.3 },
  t(yarisCrossBase, { trimName: "G 1.5L ガソリン", driveType: "2WD", transmission: "CVT", lengthMm: 4180, widthMm: 1765, heightMm: 1590, weightKg: 1120, minTurningRadiusM: 5.3 }),
  t(yarisCrossBase, { trimName: "G 1.5L ガソリン", driveType: "4WD", transmission: "CVT", lengthMm: 4180, widthMm: 1765, heightMm: 1590, weightKg: 1180, minTurningRadiusM: 5.3 }),
  t(yarisCrossBase, { trimName: "Z 1.5L ガソリン", driveType: "2WD", transmission: "CVT", lengthMm: 4180, widthMm: 1765, heightMm: 1590, weightKg: 1140, minTurningRadiusM: 5.3 }),
  t(yarisCrossBase, { trimName: "Z 1.5L ガソリン", driveType: "4WD", transmission: "CVT", lengthMm: 4180, widthMm: 1765, heightMm: 1590, weightKg: 1200, minTurningRadiusM: 5.3 }),
  t(yarisCrossBase, { trimName: "Z Adventure 1.5L ガソリン", driveType: "2WD", transmission: "CVT", lengthMm: 4200, widthMm: 1765, heightMm: 1590, weightKg: 1150, minTurningRadiusM: 5.3 }),
  t(yarisCrossBase, { trimName: "Z Adventure 1.5L ガソリン", driveType: "4WD", transmission: "CVT", lengthMm: 4200, widthMm: 1765, heightMm: 1590, weightKg: 1210, minTurningRadiusM: 5.3 }),
  t(yarisCrossBase, { trimName: "G HV", driveType: "2WD", transmission: "CVT", lengthMm: 4180, widthMm: 1765, heightMm: 1590, weightKg: 1160, minTurningRadiusM: 5.3 }),
  t(yarisCrossBase, { trimName: "G HV E-Four", driveType: "4WD", transmission: "CVT", lengthMm: 4180, widthMm: 1765, heightMm: 1590, weightKg: 1250, minTurningRadiusM: 5.3 }),
  t(yarisCrossBase, { trimName: "Z HV", driveType: "2WD", transmission: "CVT", lengthMm: 4180, widthMm: 1765, heightMm: 1590, weightKg: 1190, minTurningRadiusM: 5.3 }),
  t(yarisCrossBase, { trimName: "Z HV E-Four", driveType: "4WD", transmission: "CVT", lengthMm: 4180, widthMm: 1765, heightMm: 1590, weightKg: 1260, minTurningRadiusM: 5.3 }),
  t(yarisCrossBase, { trimName: "GR SPORT 1.5L HV", driveType: "2WD", transmission: "CVT", lengthMm: 4185, widthMm: 1765, heightMm: 1580, weightKg: 1190, minTurningRadiusM: 5.3 }),

  // ============================================================
  // トヨタ プリウス 60系 5代目 (2023-)
  // ============================================================
  { ...prius60Base, trimName: "G HV", driveType: "2WD", transmission: "CVT", lengthMm: 4600, widthMm: 1780, heightMm: 1420, weightKg: 1360, minTurningRadiusM: 5.4 },
  t(prius60Base, { trimName: "G HV", driveType: "4WD", transmission: "CVT", lengthMm: 4600, widthMm: 1780, heightMm: 1420, weightKg: 1420, minTurningRadiusM: 5.4 }),
  t(prius60Base, { trimName: "Z HV", driveType: "2WD", transmission: "CVT", lengthMm: 4600, widthMm: 1780, heightMm: 1430, weightKg: 1400, minTurningRadiusM: 5.4 }),
  t(prius60Base, { trimName: "Z PHEV", driveType: "2WD", transmission: "CVT", lengthMm: 4600, widthMm: 1780, heightMm: 1430, weightKg: 1570, minTurningRadiusM: 5.4 }),

  // ============================================================
  // トヨタ プリウス 50系 4代目 (2015-2022)
  // ============================================================
  t(prius50Base, { trimName: "S HV", driveType: "2WD", transmission: "CVT", lengthMm: 4540, widthMm: 1760, heightMm: 1470, weightKg: 1360, minTurningRadiusM: 5.1 }),
  t(prius50Base, { trimName: "S HV", driveType: "4WD", transmission: "CVT", lengthMm: 4540, widthMm: 1760, heightMm: 1470, weightKg: 1410, minTurningRadiusM: 5.1 }),
  t(prius50Base, { trimName: "A HV", driveType: "2WD", transmission: "CVT", lengthMm: 4540, widthMm: 1760, heightMm: 1470, weightKg: 1380, minTurningRadiusM: 5.1 }),

  // ============================================================
  // トヨタ ランドクルーザー300 300系 (2021-)
  // ============================================================
  { ...lc300Base, trimName: "GX 3.5L ガソリン", driveType: "4WD", transmission: "10AT", lengthMm: 4950, widthMm: 1980, heightMm: 1925, weightKg: 2350, minTurningRadiusM: 5.9 },
  t(lc300Base, { trimName: "AX 3.5L ガソリン", driveType: "4WD", transmission: "10AT", lengthMm: 4950, widthMm: 1980, heightMm: 1925, weightKg: 2430, minTurningRadiusM: 5.9 }),
  t(lc300Base, { trimName: "VX 3.5L ガソリン", driveType: "4WD", transmission: "10AT", lengthMm: 4985, widthMm: 1980, heightMm: 1925, weightKg: 2480, minTurningRadiusM: 5.9 }),
  t(lc300Base, { trimName: "ZX 3.5L ガソリン", driveType: "4WD", transmission: "10AT", lengthMm: 4985, widthMm: 1980, heightMm: 1925, weightKg: 2550, minTurningRadiusM: 5.9 }),
  t(lc300Base, { trimName: "GR SPORT 3.3L ディーゼル", driveType: "4WD", transmission: "10AT", lengthMm: 4965, widthMm: 1990, heightMm: 1925, weightKg: 2560, minTurningRadiusM: 5.9 }),
  t(lc300Base, { trimName: "ZX 3.3L ディーゼル", driveType: "4WD", transmission: "10AT", lengthMm: 4985, widthMm: 1980, heightMm: 1925, weightKg: 2530, minTurningRadiusM: 5.9 }),

  // ============================================================
  // ホンダ N-BOX 3代目 JF5/JF6 (2023-) ※4WDは全高1815mm
  // ============================================================
  { ...nbox3Base, trimName: "ベースグレード", driveType: "2WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1790, weightKg: 910, minTurningRadiusM: 4.5 },
  t(nbox3Base, { trimName: "ベースグレード", driveType: "4WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1815, weightKg: 960, minTurningRadiusM: 4.5 }),
  t(nbox3Base, { trimName: "ファッションスタイル", driveType: "2WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1790, weightKg: 920, minTurningRadiusM: 4.5 }),
  t(nbox3Base, { trimName: "ファッションスタイル", driveType: "4WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1815, weightKg: 970, minTurningRadiusM: 4.5 }),
  t(nbox3Base, { trimName: "Custom ベースグレード", driveType: "2WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1790, weightKg: 920, minTurningRadiusM: 4.5 }),
  t(nbox3Base, { trimName: "Custom ベースグレード", driveType: "4WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1815, weightKg: 980, minTurningRadiusM: 4.5 }),
  t(nbox3Base, { trimName: "Custom ターボ", driveType: "2WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1790, weightKg: 940, minTurningRadiusM: 4.8 }),
  t(nbox3Base, { trimName: "Custom ターボ", driveType: "4WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1815, weightKg: 990, minTurningRadiusM: 4.8 }),
  t(nbox3Base, { trimName: "Custom コーディネートスタイル", driveType: "2WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1790, weightKg: 920, minTurningRadiusM: 4.5 }),
  t(nbox3Base, { trimName: "Custom コーディネートスタイル", driveType: "4WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1815, weightKg: 980, minTurningRadiusM: 4.5 }),

  // ============================================================
  // ホンダ N-BOX 2代目 JF3/JF4 (2017-2023) ※4WDは全高1815mm
  // ============================================================
  t(nbox2Base, { trimName: "G", driveType: "2WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1790, weightKg: 890, minTurningRadiusM: 4.5 }),
  t(nbox2Base, { trimName: "G", driveType: "4WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1815, weightKg: 950, minTurningRadiusM: 4.5 }),
  t(nbox2Base, { trimName: "L", driveType: "2WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1790, weightKg: 900, minTurningRadiusM: 4.5 }),
  t(nbox2Base, { trimName: "L", driveType: "4WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1815, weightKg: 960, minTurningRadiusM: 4.5 }),
  t(nbox2Base, { trimName: "EX", driveType: "2WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1790, weightKg: 900, minTurningRadiusM: 4.5 }),
  t(nbox2Base, { trimName: "EX", driveType: "4WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1815, weightKg: 960, minTurningRadiusM: 4.5 }),
  t(nbox2Base, { trimName: "Custom L", driveType: "2WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1790, weightKg: 910, minTurningRadiusM: 4.5 }),
  t(nbox2Base, { trimName: "Custom L", driveType: "4WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1815, weightKg: 970, minTurningRadiusM: 4.5 }),
  t(nbox2Base, { trimName: "Custom L ターボ", driveType: "2WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1790, weightKg: 920, minTurningRadiusM: 4.7 }),
  t(nbox2Base, { trimName: "Custom L ターボ", driveType: "4WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1815, weightKg: 980, minTurningRadiusM: 4.7 }),
  t(nbox2Base, { trimName: "Custom EX ターボ", driveType: "2WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1790, weightKg: 930, minTurningRadiusM: 4.7 }),
  t(nbox2Base, { trimName: "Custom EX ターボ", driveType: "4WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1815, weightKg: 990, minTurningRadiusM: 4.7 }),

  // ============================================================
  // ホンダ フリード 3代目 (2024-) ※CROSSTARは全幅1720mm
  // ============================================================
  { ...freed3Base, trimName: "AIR", driveType: "2WD", transmission: "CVT", lengthMm: 4310, widthMm: 1695, heightMm: 1755, weightKg: 1370, minTurningRadiusM: 5.2 },
  t(freed3Base, { trimName: "AIR", driveType: "4WD", transmission: "CVT", lengthMm: 4310, widthMm: 1695, heightMm: 1780, weightKg: 1440, minTurningRadiusM: 5.2 }),
  t(freed3Base, { trimName: "AIR EX", driveType: "2WD", transmission: "CVT", lengthMm: 4310, widthMm: 1695, heightMm: 1755, weightKg: 1380, minTurningRadiusM: 5.2 }),
  t(freed3Base, { trimName: "AIR EX", driveType: "4WD", transmission: "CVT", lengthMm: 4310, widthMm: 1695, heightMm: 1780, weightKg: 1450, minTurningRadiusM: 5.2 }),
  t(freed3Base, { trimName: "CROSSTAR", driveType: "2WD", transmission: "CVT", lengthMm: 4310, widthMm: 1720, heightMm: 1755, weightKg: 1400, minTurningRadiusM: 5.2 }),
  t(freed3Base, { trimName: "CROSSTAR", driveType: "4WD", transmission: "CVT", lengthMm: 4310, widthMm: 1720, heightMm: 1780, weightKg: 1470, minTurningRadiusM: 5.2 }),
  t(freed3Base, { trimName: "e:HEV AIR", driveType: "2WD", transmission: "CVT", lengthMm: 4310, widthMm: 1695, heightMm: 1755, weightKg: 1410, minTurningRadiusM: 5.2 }),
  t(freed3Base, { trimName: "e:HEV AIR", driveType: "4WD", transmission: "CVT", lengthMm: 4310, widthMm: 1695, heightMm: 1780, weightKg: 1490, minTurningRadiusM: 5.2 }),
  t(freed3Base, { trimName: "e:HEV AIR EX", driveType: "2WD", transmission: "CVT", lengthMm: 4310, widthMm: 1695, heightMm: 1755, weightKg: 1420, minTurningRadiusM: 5.2 }),
  t(freed3Base, { trimName: "e:HEV AIR EX", driveType: "4WD", transmission: "CVT", lengthMm: 4310, widthMm: 1695, heightMm: 1780, weightKg: 1500, minTurningRadiusM: 5.2 }),
  t(freed3Base, { trimName: "e:HEV CROSSTAR", driveType: "2WD", transmission: "CVT", lengthMm: 4310, widthMm: 1720, heightMm: 1755, weightKg: 1440, minTurningRadiusM: 5.2 }),
  t(freed3Base, { trimName: "e:HEV CROSSTAR", driveType: "4WD", transmission: "CVT", lengthMm: 4310, widthMm: 1720, heightMm: 1780, weightKg: 1520, minTurningRadiusM: 5.2 }),

  // ============================================================
  // ホンダ フリード 2代目 GB5/6/7/8 (2016-2024)
  // ============================================================
  t(freed2Base, { trimName: "G (7人)", driveType: "2WD", transmission: "CVT", lengthMm: 4265, widthMm: 1695, heightMm: 1710, weightKg: 1360, minTurningRadiusM: 5.2 }),
  t(freed2Base, { trimName: "G (6人)", driveType: "2WD", transmission: "CVT", lengthMm: 4265, widthMm: 1695, heightMm: 1710, weightKg: 1350, minTurningRadiusM: 5.2 }),
  t(freed2Base, { trimName: "G (6人)", driveType: "4WD", transmission: "CVT", lengthMm: 4265, widthMm: 1695, heightMm: 1735, weightKg: 1410, minTurningRadiusM: 5.2 }),
  t(freed2Base, { trimName: "CROSSTAR (6人)", driveType: "2WD", transmission: "CVT", lengthMm: 4265, widthMm: 1695, heightMm: 1710, weightKg: 1380, minTurningRadiusM: 5.2 }),
  t(freed2Base, { trimName: "CROSSTAR (6人)", driveType: "4WD", transmission: "CVT", lengthMm: 4265, widthMm: 1695, heightMm: 1735, weightKg: 1440, minTurningRadiusM: 5.2 }),
  t(freed2Base, { trimName: "HYBRID G (7人)", driveType: "2WD", transmission: "7DCT", lengthMm: 4265, widthMm: 1695, heightMm: 1710, weightKg: 1430, minTurningRadiusM: 5.2 }),
  t(freed2Base, { trimName: "HYBRID G (6人)", driveType: "2WD", transmission: "7DCT", lengthMm: 4265, widthMm: 1695, heightMm: 1710, weightKg: 1410, minTurningRadiusM: 5.2 }),
  t(freed2Base, { trimName: "HYBRID G (6人)", driveType: "4WD", transmission: "7DCT", lengthMm: 4265, widthMm: 1695, heightMm: 1735, weightKg: 1480, minTurningRadiusM: 5.2 }),
  t(freed2Base, { trimName: "HYBRID CROSSTAR (6人)", driveType: "2WD", transmission: "7DCT", lengthMm: 4265, widthMm: 1695, heightMm: 1710, weightKg: 1440, minTurningRadiusM: 5.2 }),
  t(freed2Base, { trimName: "HYBRID CROSSTAR (6人)", driveType: "4WD", transmission: "7DCT", lengthMm: 4265, widthMm: 1695, heightMm: 1735, weightKg: 1510, minTurningRadiusM: 5.2 }),

  // ============================================================
  // 日産 セレナ C28型 (2022-)
  // ============================================================
  { ...serenaC28Base, trimName: "X", driveType: "2WD", transmission: "CVT", lengthMm: 4690, widthMm: 1695, heightMm: 1870, weightKg: 1670, minTurningRadiusM: 5.7 },
  t(serenaC28Base, { trimName: "X", driveType: "4WD", transmission: "CVT", lengthMm: 4690, widthMm: 1695, heightMm: 1870, weightKg: 1740, minTurningRadiusM: 5.7 }),
  t(serenaC28Base, { trimName: "XV", driveType: "2WD", transmission: "CVT", lengthMm: 4690, widthMm: 1695, heightMm: 1870, weightKg: 1680, minTurningRadiusM: 5.7 }),
  t(serenaC28Base, { trimName: "XV", driveType: "4WD", transmission: "CVT", lengthMm: 4690, widthMm: 1695, heightMm: 1870, weightKg: 1750, minTurningRadiusM: 5.7 }),
  t(serenaC28Base, { trimName: "ハイウェイスターV", driveType: "2WD", transmission: "CVT", lengthMm: 4765, widthMm: 1715, heightMm: 1870, weightKg: 1690, minTurningRadiusM: 5.7 }),
  t(serenaC28Base, { trimName: "ハイウェイスターV", driveType: "4WD", transmission: "CVT", lengthMm: 4765, widthMm: 1715, heightMm: 1870, weightKg: 1760, minTurningRadiusM: 5.7 }),
  t(serenaC28Base, { trimName: "e-POWER X", driveType: "2WD", transmission: "e-POWER", lengthMm: 4690, widthMm: 1695, heightMm: 1870, weightKg: 1760, minTurningRadiusM: 5.7 }),
  t(serenaC28Base, { trimName: "e-POWER XV", driveType: "2WD", transmission: "e-POWER", lengthMm: 4690, widthMm: 1695, heightMm: 1870, weightKg: 1770, minTurningRadiusM: 5.7 }),
  t(serenaC28Base, { trimName: "e-POWER ハイウェイスターV", driveType: "2WD", transmission: "e-POWER", lengthMm: 4765, widthMm: 1715, heightMm: 1870, weightKg: 1790, minTurningRadiusM: 5.7 }),
  t(serenaC28Base, { trimName: "e-POWER LUXION", driveType: "2WD", transmission: "e-POWER", lengthMm: 4765, widthMm: 1715, heightMm: 1885, weightKg: 1810, minTurningRadiusM: 5.7 }),

  // ============================================================
  // 日産 セレナ C27型 (2016-2022)
  // ============================================================
  t(serenaC27Base, { trimName: "X", driveType: "2WD", transmission: "CVT", lengthMm: 4690, widthMm: 1695, heightMm: 1865, weightKg: 1650, minTurningRadiusM: 5.5 }),
  t(serenaC27Base, { trimName: "X", driveType: "4WD", transmission: "CVT", lengthMm: 4690, widthMm: 1695, heightMm: 1875, weightKg: 1730, minTurningRadiusM: 5.5 }),
  t(serenaC27Base, { trimName: "XV", driveType: "2WD", transmission: "CVT", lengthMm: 4690, widthMm: 1695, heightMm: 1865, weightKg: 1660, minTurningRadiusM: 5.5 }),
  t(serenaC27Base, { trimName: "ハイウェイスター", driveType: "2WD", transmission: "CVT", lengthMm: 4770, widthMm: 1740, heightMm: 1865, weightKg: 1680, minTurningRadiusM: 5.5 }),
  t(serenaC27Base, { trimName: "ハイウェイスター", driveType: "4WD", transmission: "CVT", lengthMm: 4770, widthMm: 1740, heightMm: 1875, weightKg: 1760, minTurningRadiusM: 5.5 }),
  t(serenaC27Base, { trimName: "ハイウェイスターV", driveType: "2WD", transmission: "CVT", lengthMm: 4770, widthMm: 1740, heightMm: 1865, weightKg: 1700, minTurningRadiusM: 5.7 }),
  t(serenaC27Base, { trimName: "e-POWER X", driveType: "2WD", transmission: "e-POWER", lengthMm: 4690, widthMm: 1695, heightMm: 1865, weightKg: 1740, minTurningRadiusM: 5.5 }),
  t(serenaC27Base, { trimName: "e-POWER ハイウェイスターV", driveType: "2WD", transmission: "e-POWER", lengthMm: 4770, widthMm: 1740, heightMm: 1865, weightKg: 1760, minTurningRadiusM: 5.7 }),

  // ============================================================
  // マツダ CX-5 2代目 (2017-)
  // ============================================================
  { ...cx5Base, trimName: "20S", driveType: "2WD", transmission: "6AT", lengthMm: 4545, widthMm: 1840, heightMm: 1690, weightKg: 1520, minTurningRadiusM: 5.5 },
  t(cx5Base, { trimName: "20S", driveType: "4WD", transmission: "6AT", lengthMm: 4545, widthMm: 1840, heightMm: 1690, weightKg: 1590, minTurningRadiusM: 5.5 }),
  t(cx5Base, { trimName: "25S L Package", driveType: "2WD", transmission: "6AT", lengthMm: 4545, widthMm: 1840, heightMm: 1690, weightKg: 1560, minTurningRadiusM: 5.5 }),
  t(cx5Base, { trimName: "25S L Package", driveType: "4WD", transmission: "6AT", lengthMm: 4545, widthMm: 1840, heightMm: 1690, weightKg: 1620, minTurningRadiusM: 5.5 }),
  t(cx5Base, { trimName: "XD", driveType: "2WD", transmission: "6AT", lengthMm: 4545, widthMm: 1840, heightMm: 1690, weightKg: 1600, minTurningRadiusM: 5.5 }),
  t(cx5Base, { trimName: "XD L Package", driveType: "2WD", transmission: "6AT", lengthMm: 4545, widthMm: 1840, heightMm: 1690, weightKg: 1620, minTurningRadiusM: 5.5 }),
  t(cx5Base, { trimName: "XD L Package", driveType: "4WD", transmission: "6AT", lengthMm: 4545, widthMm: 1840, heightMm: 1690, weightKg: 1680, minTurningRadiusM: 5.5 }),
  t(cx5Base, { trimName: "XD Exclusive Mode", driveType: "4WD", transmission: "6AT", lengthMm: 4545, widthMm: 1840, heightMm: 1690, weightKg: 1690, minTurningRadiusM: 5.5 }),

  // ============================================================
  // マツダ CX-60 初代 (2022-)
  // ============================================================
  { ...cx60Base, trimName: "25S S Package", driveType: "2WD", transmission: "8AT", lengthMm: 4740, widthMm: 1890, heightMm: 1685, weightKg: 1680, minTurningRadiusM: 5.4 },
  t(cx60Base, { trimName: "25S L Package", driveType: "2WD", transmission: "8AT", lengthMm: 4740, widthMm: 1890, heightMm: 1685, weightKg: 1710, minTurningRadiusM: 5.4 }),
  t(cx60Base, { trimName: "XD S Package", driveType: "2WD", transmission: "8AT", lengthMm: 4740, widthMm: 1890, heightMm: 1685, weightKg: 1760, minTurningRadiusM: 5.4 }),
  t(cx60Base, { trimName: "XD L Package", driveType: "4WD", transmission: "8AT", lengthMm: 4740, widthMm: 1890, heightMm: 1685, weightKg: 1890, minTurningRadiusM: 5.4 }),
  t(cx60Base, { trimName: "XD-HYBRID Premium Sports", driveType: "4WD", transmission: "8AT", lengthMm: 4740, widthMm: 1890, heightMm: 1685, weightKg: 1920, minTurningRadiusM: 5.4 }),
  t(cx60Base, { trimName: "PHEV S Package", driveType: "4WD", transmission: "8AT", lengthMm: 4740, widthMm: 1890, heightMm: 1685, weightKg: 2010, minTurningRadiusM: 5.4 }),
  t(cx60Base, { trimName: "PHEV Premium Sports", driveType: "4WD", transmission: "8AT", lengthMm: 4740, widthMm: 1890, heightMm: 1685, weightKg: 2060, minTurningRadiusM: 5.4 }),

  // ============================================================
  // スバル フォレスター 6代目 (2024-)
  // ============================================================
  { ...forester6Base, trimName: "Touring", driveType: "AWD", transmission: "CVT", lengthMm: 4655, widthMm: 1830, heightMm: 1730, weightKg: 1600, minTurningRadiusM: 5.4 },
  t(forester6Base, { trimName: "X-BREAK", driveType: "AWD", transmission: "CVT", lengthMm: 4655, widthMm: 1830, heightMm: 1730, weightKg: 1610, minTurningRadiusM: 5.4 }),
  t(forester6Base, { trimName: "Advance", driveType: "AWD", transmission: "CVT", lengthMm: 4655, widthMm: 1830, heightMm: 1730, weightKg: 1620, minTurningRadiusM: 5.4 }),
  t(forester6Base, { trimName: "S Limited", driveType: "AWD", transmission: "CVT", lengthMm: 4655, widthMm: 1830, heightMm: 1730, weightKg: 1630, minTurningRadiusM: 5.4 }),

  // ============================================================
  // スバル フォレスター 5代目 SK (2018-2024)
  // ============================================================
  t(forester5Base, { trimName: "Touring", driveType: "AWD", transmission: "CVT", lengthMm: 4640, widthMm: 1815, heightMm: 1715, weightKg: 1570, minTurningRadiusM: 5.4 }),
  t(forester5Base, { trimName: "X-BREAK", driveType: "AWD", transmission: "CVT", lengthMm: 4640, widthMm: 1815, heightMm: 1715, weightKg: 1580, minTurningRadiusM: 5.4 }),
  t(forester5Base, { trimName: "Advance e-BOXER", driveType: "AWD", transmission: "CVT", lengthMm: 4640, widthMm: 1815, heightMm: 1715, weightKg: 1640, minTurningRadiusM: 5.4 }),
  t(forester5Base, { trimName: "Sport", driveType: "AWD", transmission: "CVT", lengthMm: 4640, widthMm: 1815, heightMm: 1715, weightKg: 1570, minTurningRadiusM: 5.4 }),
  t(forester5Base, { trimName: "STI Sport", driveType: "AWD", transmission: "CVT", lengthMm: 4640, widthMm: 1815, heightMm: 1715, weightKg: 1580, minTurningRadiusM: 5.4 }),

  // ============================================================
  // レクサス RX 5代目 (2022-)
  // ============================================================
  { ...rx5Base, trimName: "RX350", driveType: "2WD", transmission: "8AT", lengthMm: 4890, widthMm: 1920, heightMm: 1700, weightKg: 1880, minTurningRadiusM: 5.9 },
  t(rx5Base, { trimName: "RX350", driveType: "AWD", transmission: "8AT", lengthMm: 4890, widthMm: 1920, heightMm: 1700, weightKg: 1950, minTurningRadiusM: 5.9 }),
  t(rx5Base, { trimName: "RX350 version L", driveType: "2WD", transmission: "8AT", lengthMm: 4890, widthMm: 1920, heightMm: 1700, weightKg: 1950, minTurningRadiusM: 5.9 }),
  t(rx5Base, { trimName: "RX350h", driveType: "AWD", transmission: "CVT", lengthMm: 4890, widthMm: 1920, heightMm: 1700, weightKg: 2000, minTurningRadiusM: 5.9 }),
  t(rx5Base, { trimName: "RX350h version L", driveType: "AWD", transmission: "CVT", lengthMm: 4890, widthMm: 1920, heightMm: 1700, weightKg: 2010, minTurningRadiusM: 5.9 }),
  t(rx5Base, { trimName: "RX450h+ PHEV", driveType: "AWD", transmission: "CVT", lengthMm: 4890, widthMm: 1920, heightMm: 1700, weightKg: 2110, minTurningRadiusM: 5.9 }),
  t(rx5Base, { trimName: "RX500h F SPORT Performance", driveType: "AWD", transmission: "6AT", lengthMm: 4890, widthMm: 1920, heightMm: 1700, weightKg: 2100, minTurningRadiusM: 5.9 }),

  // ============================================================
  // レクサス RX 4代目 (2015-2022)
  // ============================================================
  t(rx4Base, { trimName: "RX300", driveType: "2WD", transmission: "6AT", lengthMm: 4890, widthMm: 1895, heightMm: 1710, weightKg: 1890, minTurningRadiusM: 5.9 }),
  t(rx4Base, { trimName: "RX300", driveType: "AWD", transmission: "6AT", lengthMm: 4890, widthMm: 1895, heightMm: 1710, weightKg: 1940, minTurningRadiusM: 5.9 }),
  t(rx4Base, { trimName: "RX450h", driveType: "2WD", transmission: "CVT", lengthMm: 4890, widthMm: 1895, heightMm: 1710, weightKg: 2010, minTurningRadiusM: 5.9 }),
  t(rx4Base, { trimName: "RX450h", driveType: "AWD", transmission: "CVT", lengthMm: 4890, widthMm: 1895, heightMm: 1710, weightKg: 2100, minTurningRadiusM: 5.9 }),

  // ============================================================
  // レクサス NX 2代目 (2021-)
  // ============================================================
  { ...nx2Base, trimName: "NX250", driveType: "2WD", transmission: "8AT", lengthMm: 4660, widthMm: 1865, heightMm: 1660, weightKg: 1620, minTurningRadiusM: 5.4 },
  t(nx2Base, { trimName: "NX250", driveType: "AWD", transmission: "8AT", lengthMm: 4660, widthMm: 1865, heightMm: 1660, weightKg: 1680, minTurningRadiusM: 5.4 }),
  t(nx2Base, { trimName: "NX350h", driveType: "2WD", transmission: "CVT", lengthMm: 4660, widthMm: 1865, heightMm: 1660, weightKg: 1720, minTurningRadiusM: 5.4 }),
  t(nx2Base, { trimName: "NX350h", driveType: "AWD", transmission: "CVT", lengthMm: 4660, widthMm: 1865, heightMm: 1660, weightKg: 1790, minTurningRadiusM: 5.4 }),
  t(nx2Base, { trimName: "NX350", driveType: "AWD", transmission: "8AT", lengthMm: 4660, widthMm: 1865, heightMm: 1660, weightKg: 1740, minTurningRadiusM: 5.4 }),
  t(nx2Base, { trimName: "NX450h+ PHEV", driveType: "AWD", transmission: "CVT", lengthMm: 4660, widthMm: 1865, heightMm: 1660, weightKg: 1990, minTurningRadiusM: 5.4 }),

  // ============================================================
  // レクサス NX 初代 (2014-2021)
  // ============================================================
  t(nx1Base, { trimName: "NX300", driveType: "2WD", transmission: "6AT", lengthMm: 4640, widthMm: 1845, heightMm: 1645, weightKg: 1710, minTurningRadiusM: 5.3 }),
  t(nx1Base, { trimName: "NX300", driveType: "AWD", transmission: "6AT", lengthMm: 4640, widthMm: 1845, heightMm: 1645, weightKg: 1770, minTurningRadiusM: 5.3 }),
  t(nx1Base, { trimName: "NX300h", driveType: "2WD", transmission: "CVT", lengthMm: 4640, widthMm: 1845, heightMm: 1645, weightKg: 1780, minTurningRadiusM: 5.3 }),

  // ============================================================
  // BMW X3 G45 (2024-)
  // ============================================================
  { ...x3g45Base, trimName: "xDrive20d", driveType: "AWD", transmission: "8AT", lengthMm: 4755, widthMm: 1920, heightMm: 1660, weightKg: 1965, minTurningRadiusM: 5.7 },
  t(x3g45Base, { trimName: "xDrive30e PHEV", driveType: "AWD", transmission: "8AT", lengthMm: 4755, widthMm: 1920, heightMm: 1660, weightKg: 2195, minTurningRadiusM: 5.7 }),

  // ============================================================
  // BMW X3 G01 (2017-2024)
  // ============================================================
  t(x3g01Base, { trimName: "xDrive20d", driveType: "AWD", transmission: "8AT", lengthMm: 4720, widthMm: 1890, heightMm: 1675, weightKg: 1850, minTurningRadiusM: 5.7 }),
  t(x3g01Base, { trimName: "xDrive20i", driveType: "AWD", transmission: "8AT", lengthMm: 4720, widthMm: 1890, heightMm: 1675, weightKg: 1770, minTurningRadiusM: 5.7 }),
  t(x3g01Base, { trimName: "M40d", driveType: "AWD", transmission: "8AT", lengthMm: 4720, widthMm: 1890, heightMm: 1675, weightKg: 1950, minTurningRadiusM: 5.7 }),
  t(x3g01Base, { trimName: "xDrive30e PHEV", driveType: "AWD", transmission: "8AT", lengthMm: 4720, widthMm: 1890, heightMm: 1675, weightKg: 2040, minTurningRadiusM: 5.7 }),

  // ============================================================
  // BMW 3シリーズ G20 (2019-)
  // ============================================================
  { ...series3Base, trimName: "318i", driveType: "2WD", transmission: "8AT", lengthMm: 4715, widthMm: 1825, heightMm: 1440, weightKg: 1480, minTurningRadiusM: 5.3 },
  t(series3Base, { trimName: "320i", driveType: "2WD", transmission: "8AT", lengthMm: 4715, widthMm: 1825, heightMm: 1440, weightKg: 1520, minTurningRadiusM: 5.3 }),
  t(series3Base, { trimName: "320d xDrive", driveType: "AWD", transmission: "8AT", lengthMm: 4715, widthMm: 1825, heightMm: 1440, weightKg: 1680, minTurningRadiusM: 5.3 }),
  t(series3Base, { trimName: "330i", driveType: "2WD", transmission: "8AT", lengthMm: 4715, widthMm: 1825, heightMm: 1440, weightKg: 1580, minTurningRadiusM: 5.3 }),
  t(series3Base, { trimName: "M340i xDrive", driveType: "AWD", transmission: "8AT", lengthMm: 4715, widthMm: 1825, heightMm: 1440, weightKg: 1740, minTurningRadiusM: 5.3 }),

  // ============================================================
  // メルセデス・ベンツ GLC X254 (2022-)
  // ============================================================
  { ...glcX254Base, trimName: "GLC200d 4MATIC", driveType: "AWD", transmission: "9AT", lengthMm: 4720, widthMm: 1890, heightMm: 1640, weightKg: 1930, minTurningRadiusM: 5.5 },
  t(glcX254Base, { trimName: "GLC220d 4MATIC", driveType: "AWD", transmission: "9AT", lengthMm: 4720, widthMm: 1890, heightMm: 1640, weightKg: 1950, minTurningRadiusM: 5.5 }),
  t(glcX254Base, { trimName: "GLC300 4MATIC", driveType: "AWD", transmission: "9AT", lengthMm: 4720, widthMm: 1890, heightMm: 1640, weightKg: 1880, minTurningRadiusM: 5.5 }),
  t(glcX254Base, { trimName: "GLC350e 4MATIC PHEV", driveType: "AWD", transmission: "9AT", lengthMm: 4720, widthMm: 1890, heightMm: 1640, weightKg: 2170, minTurningRadiusM: 5.5 }),

  // ============================================================
  // メルセデス・ベンツ GLC X253 (2016-2022)
  // ============================================================
  t(glcX253Base, { trimName: "GLC200", driveType: "2WD", transmission: "9AT", lengthMm: 4670, widthMm: 1890, heightMm: 1645, weightKg: 1760, minTurningRadiusM: 5.5 }),
  t(glcX253Base, { trimName: "GLC220d 4MATIC", driveType: "AWD", transmission: "9AT", lengthMm: 4670, widthMm: 1890, heightMm: 1645, weightKg: 1860, minTurningRadiusM: 5.5 }),
  t(glcX253Base, { trimName: "GLC300 4MATIC", driveType: "AWD", transmission: "9AT", lengthMm: 4670, widthMm: 1890, heightMm: 1645, weightKg: 1820, minTurningRadiusM: 5.5 }),

  // ============================================================
  // アウディ Q5 FY (2017-)
  // ============================================================
  { ...q5Base, trimName: "40 TDI quattro", driveType: "AWD", transmission: "7AT", lengthMm: 4680, widthMm: 1900, heightMm: 1665, weightKg: 1920, minTurningRadiusM: 5.5 },
  t(q5Base, { trimName: "45 TFSI quattro", driveType: "AWD", transmission: "7AT", lengthMm: 4680, widthMm: 1900, heightMm: 1665, weightKg: 1870, minTurningRadiusM: 5.5 }),
  t(q5Base, { trimName: "55 TFSI e quattro PHEV", driveType: "AWD", transmission: "7AT", lengthMm: 4680, widthMm: 1900, heightMm: 1665, weightKg: 2110, minTurningRadiusM: 5.5 }),
  t(q5Base, { trimName: "SQ5 3.0 TFSI quattro", driveType: "AWD", transmission: "8AT", lengthMm: 4680, widthMm: 1900, heightMm: 1665, weightKg: 1960, minTurningRadiusM: 5.5 }),

  // ============================================================
  // ボルボ XC60 2代目 (2017-)
  // ============================================================
  { ...xc60Base, trimName: "B5 AWD Momentum", driveType: "AWD", transmission: "8AT", lengthMm: 4710, widthMm: 1900, heightMm: 1660, weightKg: 1890, minTurningRadiusM: 5.7 },
  t(xc60Base, { trimName: "B5 AWD Inscription", driveType: "AWD", transmission: "8AT", lengthMm: 4710, widthMm: 1900, heightMm: 1660, weightKg: 1910, minTurningRadiusM: 5.7 }),
  t(xc60Base, { trimName: "T8 Recharge PHEV", driveType: "AWD", transmission: "8AT", lengthMm: 4710, widthMm: 1900, heightMm: 1660, weightKg: 2150, minTurningRadiusM: 5.7 }),
  t(xc60Base, { trimName: "Ultimate B5", driveType: "AWD", transmission: "8AT", lengthMm: 4710, widthMm: 1900, heightMm: 1660, weightKg: 1920, minTurningRadiusM: 5.7 }),

  // ============================================================
  // トヨタ ヴェルファイア 40系 (2023-)
  // ============================================================
  { ...vellfire40Base, trimName: "Z Premier 2.4L ターボ", driveType: "2WD", transmission: "8AT", lengthMm: 4995, widthMm: 1850, heightMm: 1945, weightKg: 2180, minTurningRadiusM: 5.9 },
  t(vellfire40Base, { trimName: "Z Premier 2.4L ターボ", driveType: "4WD", transmission: "8AT", lengthMm: 4995, widthMm: 1850, heightMm: 1945, weightKg: 2240, minTurningRadiusM: 5.9 }),
  t(vellfire40Base, { trimName: "Executive Lounge 2.5L HV", driveType: "2WD", transmission: "CVT", lengthMm: 4995, widthMm: 1850, heightMm: 1945, weightKg: 2250, minTurningRadiusM: 5.9 }),
  t(vellfire40Base, { trimName: "Executive Lounge 2.5L HV", driveType: "4WD", transmission: "CVT", lengthMm: 4995, widthMm: 1850, heightMm: 1945, weightKg: 2310, minTurningRadiusM: 5.9 }),

  // ============================================================
  // トヨタ ヴェルファイア 30系後期 (2018-2022)
  // ============================================================
  t(vellfire30Base, { trimName: "2.5Z Gエディション", driveType: "2WD", transmission: "CVT", lengthMm: 4935, widthMm: 1850, heightMm: 1935, weightKg: 2010, minTurningRadiusM: 5.8 }),
  t(vellfire30Base, { trimName: "3.5Z G", driveType: "4WD", transmission: "8AT", lengthMm: 4935, widthMm: 1850, heightMm: 1950, weightKg: 2150, minTurningRadiusM: 5.8 }),
  t(vellfire30Base, { trimName: "HV ZR Gエディション", driveType: "4WD", transmission: "CVT", lengthMm: 4935, widthMm: 1850, heightMm: 1950, weightKg: 2190, minTurningRadiusM: 5.6 }),

  // ============================================================
  // トヨタ ノア 90系 (2022-)
  // ============================================================
  { ...noah90Base, trimName: "S-Z 2.0L", driveType: "2WD", transmission: "CVT", lengthMm: 4695, widthMm: 1730, heightMm: 1895, weightKg: 1640, minTurningRadiusM: 5.5 },
  t(noah90Base, { trimName: "X 2.0L", driveType: "2WD", transmission: "CVT", lengthMm: 4695, widthMm: 1730, heightMm: 1895, weightKg: 1600, minTurningRadiusM: 5.5 }),
  t(noah90Base, { trimName: "S-Z 2.0L", driveType: "4WD", transmission: "CVT", lengthMm: 4695, widthMm: 1730, heightMm: 1925, weightKg: 1700, minTurningRadiusM: 5.5 }),
  t(noah90Base, { trimName: "S-Z HV", driveType: "2WD", transmission: "CVT", lengthMm: 4695, widthMm: 1730, heightMm: 1895, weightKg: 1690, minTurningRadiusM: 5.5 }),
  t(noah90Base, { trimName: "S-Z HV", driveType: "4WD", transmission: "CVT", lengthMm: 4695, widthMm: 1730, heightMm: 1925, weightKg: 1710, minTurningRadiusM: 5.5 }),

  // ============================================================
  // トヨタ シエンタ 3代目 (2022-)
  // ============================================================
  { ...sienta3Base, trimName: "X 1.5L", driveType: "2WD", transmission: "CVT", lengthMm: 4260, widthMm: 1695, heightMm: 1695, weightKg: 1270, minTurningRadiusM: 5.0 },
  t(sienta3Base, { trimName: "Z 1.5L", driveType: "2WD", transmission: "CVT", lengthMm: 4260, widthMm: 1695, heightMm: 1695, weightKg: 1300, minTurningRadiusM: 5.0 }),
  t(sienta3Base, { trimName: "Z HV", driveType: "2WD", transmission: "CVT", lengthMm: 4260, widthMm: 1695, heightMm: 1695, weightKg: 1370, minTurningRadiusM: 5.0 }),
  t(sienta3Base, { trimName: "G HV", driveType: "4WD", transmission: "CVT", lengthMm: 4260, widthMm: 1695, heightMm: 1715, weightKg: 1410, minTurningRadiusM: 5.0 }),

  // ============================================================
  // トヨタ クラウン セダン 16代目 (2023-)
  // ============================================================
  { ...crownSedanBase, trimName: "Z 2.5L マルチステージHV", driveType: "2WD", transmission: "CVT", lengthMm: 5030, widthMm: 1890, heightMm: 1475, weightKg: 2020, minTurningRadiusM: 5.7 },

  // ============================================================
  // トヨタ クラウン スポーツ (2023-)
  // ============================================================
  { ...crownSportBase, trimName: "Z 2.5L HV", driveType: "4WD", transmission: "CVT", lengthMm: 4720, widthMm: 1880, heightMm: 1565, weightKg: 1810, minTurningRadiusM: 5.4 },
  t(crownSportBase, { trimName: "RS 2.5L PHEV", driveType: "4WD", transmission: "CVT", lengthMm: 4720, widthMm: 1880, heightMm: 1570, weightKg: 2030, minTurningRadiusM: 5.4 }),

  // ============================================================
  // トヨタ クラウン クロスオーバー (2022-)
  // ============================================================
  { ...crownCrossoverBase, trimName: "X 2.5L HV", driveType: "4WD", transmission: "CVT", lengthMm: 4930, widthMm: 1840, heightMm: 1540, weightKg: 1750, minTurningRadiusM: 5.4 },
  t(crownCrossoverBase, { trimName: "G Advanced Leather Package 2.5L HV", driveType: "4WD", transmission: "CVT", lengthMm: 4930, widthMm: 1840, heightMm: 1540, weightKg: 1790, minTurningRadiusM: 5.4 }),
  t(crownCrossoverBase, { trimName: "RS 2.4L ターボHV", driveType: "4WD", transmission: "6AT", lengthMm: 4930, widthMm: 1840, heightMm: 1540, weightKg: 1920, minTurningRadiusM: 5.4 }),

  // ============================================================
  // トヨタ bZ4X (2022-)
  // ============================================================
  { ...bz4xBase, trimName: "Z", driveType: "2WD", transmission: "1AT(EV)", lengthMm: 4690, widthMm: 1860, heightMm: 1650, weightKg: 1880, minTurningRadiusM: 5.6 },
  t(bz4xBase, { trimName: "Z", driveType: "4WD", transmission: "1AT(EV)", lengthMm: 4690, widthMm: 1860, heightMm: 1650, weightKg: 1990, minTurningRadiusM: 5.6 }),

  // ============================================================
  // トヨタ ランドクルーザー250 250系 (2024-)
  // ============================================================
  { ...lc250Base, trimName: "GX 2.8L ディーゼルターボ", driveType: "4WD", transmission: "8AT", lengthMm: 4925, widthMm: 1940, heightMm: 1925, weightKg: 2320, minTurningRadiusM: 6.0 },
  t(lc250Base, { trimName: "VX 2.8L ディーゼルターボ", driveType: "4WD", transmission: "8AT", lengthMm: 4925, widthMm: 1980, heightMm: 1925, weightKg: 2380, minTurningRadiusM: 6.0 }),
  t(lc250Base, { trimName: "ZX 2.8L ディーゼルターボ", driveType: "4WD", transmission: "8AT", lengthMm: 4925, widthMm: 1980, heightMm: 1935, weightKg: 2410, minTurningRadiusM: 6.0 }),

  // ============================================================
  // トヨタ ランドクルーザープラド 150系後期 (2017-2024)
  // ============================================================
  { ...lcPrado150Base, trimName: "TX 2.7L ガソリン", driveType: "4WD", transmission: "6AT", lengthMm: 4825, widthMm: 1885, heightMm: 1850, weightKg: 2050, minTurningRadiusM: 5.8 },
  t(lcPrado150Base, { trimName: "TX 2.8L ディーゼルターボ", driveType: "4WD", transmission: "6AT", lengthMm: 4825, widthMm: 1885, heightMm: 1850, weightKg: 2220, minTurningRadiusM: 5.8 }),
  t(lcPrado150Base, { trimName: "TZ-G 2.8L ディーゼルターボ", driveType: "4WD", transmission: "6AT", lengthMm: 4825, widthMm: 1885, heightMm: 1835, weightKg: 2330, minTurningRadiusM: 5.8 }),

  // ============================================================
  // レクサス UX 300h (2018-)
  // ============================================================
  { ...uxBase, trimName: "UX300h", driveType: "2WD", transmission: "CVT", lengthMm: 4495, widthMm: 1840, heightMm: 1540, weightKg: 1510, minTurningRadiusM: 5.2 },
  t(uxBase, { trimName: "UX300h", driveType: "4WD", transmission: "CVT", lengthMm: 4495, widthMm: 1840, heightMm: 1540, weightKg: 1610, minTurningRadiusM: 5.2 }),
  t(uxBase, { trimName: "UX300h F SPORT", driveType: "2WD", transmission: "CVT", lengthMm: 4500, widthMm: 1840, heightMm: 1540, weightKg: 1540, minTurningRadiusM: 5.2 }),

  // ============================================================
  // レクサス LX 600 (2022-)
  // ============================================================
  { ...lxBase, trimName: "LX600", driveType: "4WD", transmission: "10AT", lengthMm: 5100, widthMm: 1990, heightMm: 1885, weightKg: 2590, minTurningRadiusM: 6.0 },
  t(lxBase, { trimName: "LX600 EXECUTIVE", driveType: "4WD", transmission: "10AT", lengthMm: 5100, widthMm: 1990, heightMm: 1895, weightKg: 2600, minTurningRadiusM: 6.0 }),
  t(lxBase, { trimName: "LX600 OFFROAD", driveType: "4WD", transmission: "10AT", lengthMm: 5100, widthMm: 1990, heightMm: 1885, weightKg: 2580, minTurningRadiusM: 6.0 }),

  // ============================================================
  // ホンダ CR-V 6代目 (2024-)
  // ============================================================
  { ...crvBase, trimName: "e:HEV RS", driveType: "2WD", transmission: "CVT", lengthMm: 4700, widthMm: 1865, heightMm: 1680, weightKg: 1750, minTurningRadiusM: 5.5 },
  t(crvBase, { trimName: "e:HEV RS", driveType: "4WD", transmission: "CVT", lengthMm: 4700, widthMm: 1865, heightMm: 1690, weightKg: 1800, minTurningRadiusM: 5.5 }),

  // ============================================================
  // ホンダ ZR-V (2023-)
  // ============================================================
  { ...zrvBase, trimName: "X 1.5T", driveType: "2WD", transmission: "CVT", lengthMm: 4570, widthMm: 1840, heightMm: 1620, weightKg: 1470, minTurningRadiusM: 5.5 },
  t(zrvBase, { trimName: "Z 1.5T", driveType: "2WD", transmission: "CVT", lengthMm: 4570, widthMm: 1840, heightMm: 1620, weightKg: 1490, minTurningRadiusM: 5.5 }),
  t(zrvBase, { trimName: "e:HEV Z", driveType: "2WD", transmission: "CVT", lengthMm: 4570, widthMm: 1840, heightMm: 1620, weightKg: 1580, minTurningRadiusM: 5.5 }),
  t(zrvBase, { trimName: "e:HEV Z", driveType: "4WD", transmission: "CVT", lengthMm: 4570, widthMm: 1840, heightMm: 1620, weightKg: 1630, minTurningRadiusM: 5.5 }),

  // ============================================================
  // ホンダ ステップワゴン 6代目 (2022-)
  // ============================================================
  { ...stepwgnBase, trimName: "AIR 1.5T", driveType: "2WD", transmission: "CVT", lengthMm: 4800, widthMm: 1750, heightMm: 1840, weightKg: 1710, minTurningRadiusM: 5.4 },
  t(stepwgnBase, { trimName: "AIR 1.5T", driveType: "4WD", transmission: "CVT", lengthMm: 4800, widthMm: 1750, heightMm: 1855, weightKg: 1790, minTurningRadiusM: 5.4 }),
  t(stepwgnBase, { trimName: "e:HEV AIR", driveType: "2WD", transmission: "CVT", lengthMm: 4800, widthMm: 1750, heightMm: 1840, weightKg: 1810, minTurningRadiusM: 5.4 }),
  t(stepwgnBase, { trimName: "SPADA 1.5T", driveType: "2WD", transmission: "CVT", lengthMm: 4830, widthMm: 1750, heightMm: 1840, weightKg: 1740, minTurningRadiusM: 5.4 }),
  t(stepwgnBase, { trimName: "e:HEV SPADA", driveType: "2WD", transmission: "CVT", lengthMm: 4830, widthMm: 1750, heightMm: 1840, weightKg: 1840, minTurningRadiusM: 5.4 }),
  t(stepwgnBase, { trimName: "SPADA PREMIUM LINE", driveType: "2WD", transmission: "CVT", lengthMm: 4830, widthMm: 1750, heightMm: 1845, weightKg: 1740, minTurningRadiusM: 5.7 }),

  // ============================================================
  // ホンダ オデッセイ 5代目 RC系 (2023-)
  // ============================================================
  { ...odysseyBase, trimName: "e:HEV ABSOLUTE", driveType: "2WD", transmission: "CVT", lengthMm: 4860, widthMm: 1820, heightMm: 1695, weightKg: 1920, minTurningRadiusM: 5.4 },
  t(odysseyBase, { trimName: "e:HEV ABSOLUTE EX", driveType: "2WD", transmission: "CVT", lengthMm: 4860, widthMm: 1820, heightMm: 1695, weightKg: 1950, minTurningRadiusM: 5.4 }),

  // ============================================================
  // ホンダ ヴェゼル 2代目 (2021-)
  // ============================================================
  { ...vezelBase, trimName: "G 1.5L", driveType: "2WD", transmission: "CVT", lengthMm: 4330, widthMm: 1790, heightMm: 1580, weightKg: 1250, minTurningRadiusM: 5.3 },
  t(vezelBase, { trimName: "e:HEV X", driveType: "2WD", transmission: "CVT", lengthMm: 4330, widthMm: 1790, heightMm: 1580, weightKg: 1350, minTurningRadiusM: 5.3 }),
  t(vezelBase, { trimName: "e:HEV Z", driveType: "2WD", transmission: "CVT", lengthMm: 4330, widthMm: 1790, heightMm: 1590, weightKg: 1380, minTurningRadiusM: 5.5 }),
  t(vezelBase, { trimName: "e:HEV Z", driveType: "4WD", transmission: "CVT", lengthMm: 4330, widthMm: 1790, heightMm: 1590, weightKg: 1450, minTurningRadiusM: 5.5 }),

  // ============================================================
  // ホンダ WR-V (2024-)
  // ============================================================
  { ...wrvBase, trimName: "X", driveType: "2WD", transmission: "CVT", lengthMm: 4325, widthMm: 1790, heightMm: 1650, weightKg: 1210, minTurningRadiusM: 5.2 },
  t(wrvBase, { trimName: "Z", driveType: "2WD", transmission: "CVT", lengthMm: 4325, widthMm: 1790, heightMm: 1650, weightKg: 1230, minTurningRadiusM: 5.2 }),

  // ============================================================
  // 日産 エクストレイル T33型 (2022-)
  // ============================================================
  { ...xtrailBase, trimName: "X e-POWER", driveType: "2WD", transmission: "e-POWER", lengthMm: 4660, widthMm: 1840, heightMm: 1720, weightKg: 1750, minTurningRadiusM: 5.4 },
  t(xtrailBase, { trimName: "X e-4ORCE", driveType: "4WD", transmission: "e-POWER", lengthMm: 4660, widthMm: 1840, heightMm: 1720, weightKg: 1850, minTurningRadiusM: 5.4 }),
  t(xtrailBase, { trimName: "G e-4ORCE", driveType: "4WD", transmission: "e-POWER", lengthMm: 4660, widthMm: 1840, heightMm: 1720, weightKg: 1880, minTurningRadiusM: 5.4 }),

  // ============================================================
  // 日産 アリア (2022-)
  // ============================================================
  { ...ariyaBase, trimName: "B6", driveType: "2WD", transmission: "1AT(EV)", lengthMm: 4595, widthMm: 1850, heightMm: 1655, weightKg: 1920, minTurningRadiusM: 5.4 },
  t(ariyaBase, { trimName: "B6 e-4ORCE", driveType: "AWD", transmission: "1AT(EV)", lengthMm: 4595, widthMm: 1850, heightMm: 1655, weightKg: 2050, minTurningRadiusM: 5.4 }),
  t(ariyaBase, { trimName: "B9 e-4ORCE", driveType: "AWD", transmission: "1AT(EV)", lengthMm: 4595, widthMm: 1850, heightMm: 1655, weightKg: 2180, minTurningRadiusM: 5.4 }),

  // ============================================================
  // 日産 キックス P15 (2020-)
  // ============================================================
  { ...kicksBase, trimName: "X", driveType: "2WD", transmission: "e-POWER", lengthMm: 4290, widthMm: 1760, heightMm: 1605, weightKg: 1360, minTurningRadiusM: 5.1 },
  t(kicksBase, { trimName: "X FOUR", driveType: "4WD", transmission: "e-POWER", lengthMm: 4290, widthMm: 1760, heightMm: 1605, weightKg: 1480, minTurningRadiusM: 5.1 }),

  // ============================================================
  // 日産 サクラ (2022-)
  // ============================================================
  { ...sakuraBase, trimName: "X", driveType: "2WD", transmission: "1AT(EV)", lengthMm: 3395, widthMm: 1475, heightMm: 1655, weightKg: 1070, minTurningRadiusM: 4.8 },
  t(sakuraBase, { trimName: "G", driveType: "2WD", transmission: "1AT(EV)", lengthMm: 3395, widthMm: 1475, heightMm: 1655, weightKg: 1080, minTurningRadiusM: 4.8 }),

  // ============================================================
  // マツダ CX-80 (2024-)
  // ============================================================
  { ...cx80Base, trimName: "XD S Package", driveType: "2WD", transmission: "8AT", lengthMm: 4990, widthMm: 1890, heightMm: 1705, weightKg: 1990, minTurningRadiusM: 5.8 },
  t(cx80Base, { trimName: "XD L Package", driveType: "4WD", transmission: "8AT", lengthMm: 4990, widthMm: 1890, heightMm: 1710, weightKg: 2040, minTurningRadiusM: 5.8 }),
  t(cx80Base, { trimName: "XD-HYBRID Premium Sport", driveType: "4WD", transmission: "8AT", lengthMm: 4990, widthMm: 1890, heightMm: 1710, weightKg: 2120, minTurningRadiusM: 5.8 }),
  t(cx80Base, { trimName: "PHEV Premium", driveType: "4WD", transmission: "8AT", lengthMm: 4990, widthMm: 1890, heightMm: 1710, weightKg: 2240, minTurningRadiusM: 5.8 }),

  // ============================================================
  // マツダ CX-3 DK系 (2015-)
  // ============================================================
  { ...cx3Base, trimName: "15S Touring", driveType: "2WD", transmission: "6AT", lengthMm: 4275, widthMm: 1765, heightMm: 1550, weightKg: 1210, minTurningRadiusM: 5.3 },
  t(cx3Base, { trimName: "XD Touring", driveType: "2WD", transmission: "6AT", lengthMm: 4275, widthMm: 1765, heightMm: 1550, weightKg: 1300, minTurningRadiusM: 5.3 }),
  t(cx3Base, { trimName: "XD Touring", driveType: "4WD", transmission: "6AT", lengthMm: 4275, widthMm: 1765, heightMm: 1550, weightKg: 1370, minTurningRadiusM: 5.3 }),

  // ============================================================
  // マツダ CX-30 DM系 (2019-)
  // ============================================================
  { ...cx30Base, trimName: "20S", driveType: "2WD", transmission: "6AT", lengthMm: 4395, widthMm: 1795, heightMm: 1540, weightKg: 1420, minTurningRadiusM: 5.3 },
  t(cx30Base, { trimName: "20S", driveType: "4WD", transmission: "6AT", lengthMm: 4395, widthMm: 1795, heightMm: 1540, weightKg: 1500, minTurningRadiusM: 5.3 }),
  t(cx30Base, { trimName: "XD Touring", driveType: "2WD", transmission: "6AT", lengthMm: 4395, widthMm: 1795, heightMm: 1540, weightKg: 1460, minTurningRadiusM: 5.3 }),
  t(cx30Base, { trimName: "XD Touring", driveType: "4WD", transmission: "6AT", lengthMm: 4395, widthMm: 1795, heightMm: 1540, weightKg: 1540, minTurningRadiusM: 5.3 }),

  // ============================================================
  // 三菱 デリカD:5 (2019-)
  // ============================================================
  { ...delicaD5Base, trimName: "G 2.2L ディーゼルターボ", driveType: "4WD", transmission: "8AT", lengthMm: 4800, widthMm: 1795, heightMm: 1875, weightKg: 1960, minTurningRadiusM: 5.6 },
  t(delicaD5Base, { trimName: "G-Power Package 2.2L ディーゼルターボ", driveType: "4WD", transmission: "8AT", lengthMm: 4800, widthMm: 1795, heightMm: 1875, weightKg: 1990, minTurningRadiusM: 5.6 }),
  t(delicaD5Base, { trimName: "P 2.2L ディーゼルターボ", driveType: "4WD", transmission: "8AT", lengthMm: 4800, widthMm: 1815, heightMm: 1875, weightKg: 1990, minTurningRadiusM: 5.6 }),

  // ============================================================
  // 三菱 アウトランダー PHEV 4代目 (2021-)
  // ============================================================
  { ...outlanderBase, trimName: "M PHEV", driveType: "4WD", transmission: "PHEV", lengthMm: 4720, widthMm: 1860, heightMm: 1745, weightKg: 2070, minTurningRadiusM: 5.5 },
  t(outlanderBase, { trimName: "G PHEV", driveType: "4WD", transmission: "PHEV", lengthMm: 4720, widthMm: 1860, heightMm: 1750, weightKg: 2110, minTurningRadiusM: 5.5 }),
  t(outlanderBase, { trimName: "P PHEV", driveType: "4WD", transmission: "PHEV", lengthMm: 4720, widthMm: 1860, heightMm: 1750, weightKg: 2160, minTurningRadiusM: 5.5 }),

  // ============================================================
  // 三菱 エクリプス クロス MC後 (2020-)
  // ============================================================
  { ...eclipseCrossBase, trimName: "G 1.5T", driveType: "2WD", transmission: "CVT", lengthMm: 4545, widthMm: 1805, heightMm: 1685, weightKg: 1480, minTurningRadiusM: 5.4 },
  t(eclipseCrossBase, { trimName: "G 1.5T", driveType: "4WD", transmission: "CVT", lengthMm: 4545, widthMm: 1805, heightMm: 1685, weightKg: 1550, minTurningRadiusM: 5.4 }),
  t(eclipseCrossBase, { trimName: "P PHEV", driveType: "4WD", transmission: "PHEV", lengthMm: 4545, widthMm: 1805, heightMm: 1685, weightKg: 1920, minTurningRadiusM: 5.4 }),

  // ============================================================
  // スバル レガシィ アウトバック 6代目 BT系 (2021-)
  // ============================================================
  { ...outbackBase, trimName: "X-BREAK EX 1.8T", driveType: "AWD", transmission: "CVT", lengthMm: 4870, widthMm: 1875, heightMm: 1670, weightKg: 1680, minTurningRadiusM: 5.5 },
  t(outbackBase, { trimName: "Limited EX 1.8T", driveType: "AWD", transmission: "CVT", lengthMm: 4870, widthMm: 1875, heightMm: 1675, weightKg: 1690, minTurningRadiusM: 5.5 }),

  // ============================================================
  // スバル クロストレック GU系 (2022-)
  // ============================================================
  { ...crosstrekBase, trimName: "Touring", driveType: "AWD", transmission: "CVT", lengthMm: 4480, widthMm: 1800, heightMm: 1575, weightKg: 1600, minTurningRadiusM: 5.4 },
  t(crosstrekBase, { trimName: "Limited", driveType: "AWD", transmission: "CVT", lengthMm: 4480, widthMm: 1800, heightMm: 1575, weightKg: 1610, minTurningRadiusM: 5.4 }),

  // ============================================================
  // スズキ ジムニー JB64W (2018-)
  // ============================================================
  { ...jimnyBase, trimName: "XC", driveType: "4WD", transmission: "4AT", lengthMm: 3395, widthMm: 1475, heightMm: 1725, weightKg: 1040, minTurningRadiusM: 4.8 },
  t(jimnyBase, { trimName: "XC", driveType: "4WD", transmission: "5MT", lengthMm: 3395, widthMm: 1475, heightMm: 1725, weightKg: 1040, minTurningRadiusM: 4.8 }),

  // ============================================================
  // スズキ ジムニーシエラ JB74W (2018-)
  // ============================================================
  { ...jimnySierraBase, trimName: "JC", driveType: "4WD", transmission: "4AT", lengthMm: 3550, widthMm: 1645, heightMm: 1730, weightKg: 1090, minTurningRadiusM: 4.9 },
  t(jimnySierraBase, { trimName: "JC", driveType: "4WD", transmission: "5MT", lengthMm: 3550, widthMm: 1645, heightMm: 1730, weightKg: 1070, minTurningRadiusM: 4.9 }),

  // ============================================================
  // スズキ ソリオ 4代目 (2020-)
  // ============================================================
  { ...solioBase, trimName: "HYBRID MX", driveType: "2WD", transmission: "CVT", lengthMm: 3790, widthMm: 1645, heightMm: 1745, weightKg: 1000, minTurningRadiusM: 4.8 },
  t(solioBase, { trimName: "HYBRID MZ", driveType: "2WD", transmission: "CVT", lengthMm: 3790, widthMm: 1645, heightMm: 1745, weightKg: 1000, minTurningRadiusM: 4.8 }),
  t(solioBase, { trimName: "HYBRID MZ", driveType: "4WD", transmission: "CVT", lengthMm: 3790, widthMm: 1645, heightMm: 1745, weightKg: 1040, minTurningRadiusM: 4.8 }),

  // ============================================================
  // ダイハツ ロッキー (2019-)
  // ============================================================
  { ...rockyBase, trimName: "X 1.0T", driveType: "2WD", transmission: "CVT", lengthMm: 3995, widthMm: 1695, heightMm: 1620, weightKg: 970, minTurningRadiusM: 4.9 },
  t(rockyBase, { trimName: "G 1.0T", driveType: "2WD", transmission: "CVT", lengthMm: 3995, widthMm: 1695, heightMm: 1620, weightKg: 980, minTurningRadiusM: 5.0 }),
  t(rockyBase, { trimName: "X 1.0T", driveType: "4WD", transmission: "CVT", lengthMm: 3995, widthMm: 1695, heightMm: 1620, weightKg: 1040, minTurningRadiusM: 4.9 }),

  // ============================================================
  // テスラ Model Y (2022-)
  // ============================================================
  { ...modelYBase, trimName: "RWD", driveType: "2WD", transmission: "1AT(EV)", lengthMm: 4751, widthMm: 1921, heightMm: 1624, weightKg: 1930, minTurningRadiusM: 5.9 },
  t(modelYBase, { trimName: "Long Range AWD", driveType: "AWD", transmission: "1AT(EV)", lengthMm: 4751, widthMm: 1921, heightMm: 1624, weightKg: 1979, minTurningRadiusM: 5.9 }),

  // ============================================================
  // テスラ Model 3 Highland (2024-)
  // ============================================================
  { ...model3Base, trimName: "RWD", driveType: "2WD", transmission: "1AT(EV)", lengthMm: 4720, widthMm: 1850, heightMm: 1441, weightKg: 1765, minTurningRadiusM: 5.8 },
  t(model3Base, { trimName: "Long Range AWD", driveType: "AWD", transmission: "1AT(EV)", lengthMm: 4720, widthMm: 1850, heightMm: 1441, weightKg: 1828, minTurningRadiusM: 5.8 }),

  // ============================================================
  // テスラ Model X (2022-)
  // ============================================================
  { ...modelXBase, trimName: "Dual Motor AWD", driveType: "AWD", transmission: "1AT(EV)", lengthMm: 5057, widthMm: 1999, heightMm: 1680, weightKg: 2390, minTurningRadiusM: 6.4 },
  t(modelXBase, { trimName: "Plaid", driveType: "AWD", transmission: "1AT(EV)", lengthMm: 5057, widthMm: 1999, heightMm: 1680, weightKg: 2445, minTurningRadiusM: 6.4 }),

  // ============================================================
  // メルセデス・ベンツ Gクラス W463A (2018-)
  // ============================================================
  { ...gClassBase, trimName: "G450d", driveType: "4WD", transmission: "9AT", lengthMm: 4680, widthMm: 1985, heightMm: 1980, weightKg: 2560, minTurningRadiusM: 6.2 },
  t(gClassBase, { trimName: "AMG G63", driveType: "4WD", transmission: "9AT", lengthMm: 4680, widthMm: 1985, heightMm: 1975, weightKg: 2585, minTurningRadiusM: 6.2 }),

  // ============================================================
  // メルセデス・ベンツ GLS X167 (2020-)
  // ============================================================
  { ...glsBase, trimName: "GLS 400d 4MATIC", driveType: "4WD", transmission: "9AT", lengthMm: 5220, widthMm: 1956, heightMm: 1825, weightKg: 2590, minTurningRadiusM: 6.0 },

  // ============================================================
  // BMW X5 G05 (2019-)
  // ============================================================
  { ...x5Base, trimName: "xDrive35d", driveType: "AWD", transmission: "8AT", lengthMm: 4935, widthMm: 2005, heightMm: 1770, weightKg: 2290, minTurningRadiusM: 5.9 },

  // ============================================================
  // BMW X7 G07 (2019-)
  // ============================================================
  { ...x7Base, trimName: "xDrive40d", driveType: "AWD", transmission: "8AT", lengthMm: 5165, widthMm: 2000, heightMm: 1835, weightKg: 2510, minTurningRadiusM: 6.2 },

  // ============================================================
  // アウディ Q3 F3 (2019-)
  // ============================================================
  { ...q3Base, trimName: "35 TFSI", driveType: "2WD", transmission: "7AT", lengthMm: 4495, widthMm: 1840, heightMm: 1610, weightKg: 1530, minTurningRadiusM: 5.4 },
  t(q3Base, { trimName: "40 TDI quattro S line", driveType: "AWD", transmission: "7AT", lengthMm: 4495, widthMm: 1840, heightMm: 1610, weightKg: 1700, minTurningRadiusM: 5.4 }),

  // ============================================================
  // アウディ Q7 4M (2020-)
  // ============================================================
  { ...q7Base, trimName: "55 TFSI quattro", driveType: "AWD", transmission: "8AT", lengthMm: 5070, widthMm: 1970, heightMm: 1735, weightKg: 2080, minTurningRadiusM: 5.7 },

  // ============================================================
  // ポルシェ カイエン E3 (2018-)
  // ============================================================
  { ...cayenneBase, trimName: "Cayenne", driveType: "AWD", transmission: "8AT", lengthMm: 4930, widthMm: 1983, heightMm: 1698, weightKg: 2055, minTurningRadiusM: 5.9 },
  t(cayenneBase, { trimName: "Cayenne S", driveType: "AWD", transmission: "8AT", lengthMm: 4930, widthMm: 1983, heightMm: 1697, weightKg: 2160, minTurningRadiusM: 5.9 }),
  t(cayenneBase, { trimName: "Cayenne E-Hybrid", driveType: "AWD", transmission: "8AT", lengthMm: 4930, widthMm: 1983, heightMm: 1698, weightKg: 2455, minTurningRadiusM: 5.9 }),

  // ============================================================
  // ポルシェ マカン 95B (2019-)
  // ============================================================
  { ...macanBase, trimName: "Macan", driveType: "AWD", transmission: "7AT", lengthMm: 4726, widthMm: 1923, heightMm: 1621, weightKg: 1870, minTurningRadiusM: 5.6 },
  t(macanBase, { trimName: "Macan GTS", driveType: "AWD", transmission: "7AT", lengthMm: 4726, widthMm: 1923, heightMm: 1621, weightKg: 1970, minTurningRadiusM: 5.6 }),

  // ============================================================
  // ランボルギーニ ウルス (2018-)
  // ============================================================
  { ...urusBase, trimName: "Urus S", driveType: "AWD", transmission: "8AT", lengthMm: 5112, widthMm: 2016, heightMm: 1638, weightKg: 2200, minTurningRadiusM: 5.9 },
  t(urusBase, { trimName: "Urus Performante", driveType: "AWD", transmission: "8AT", lengthMm: 5112, widthMm: 2016, heightMm: 1638, weightKg: 2150, minTurningRadiusM: 5.9 }),

  // ============================================================
  // ロールス・ロイス カリナン (2018-)
  // ============================================================
  { ...cullinanBase, trimName: "Cullinan", driveType: "AWD", transmission: "8AT", lengthMm: 5355, widthMm: 2000, heightMm: 1835, weightKg: 2725, minTurningRadiusM: 6.6 },

  // ============================================================
  // フェラーリ プロサングエ (2023-)
  // ============================================================
  { ...purosangueBase, trimName: "Purosangue V12", driveType: "AWD", transmission: "8AT", lengthMm: 4973, widthMm: 2028, heightMm: 1589, weightKg: 2033, minTurningRadiusM: 6.4 },

  // ============================================================
  // ボルボ XC90 2代目 (2015-)
  // ============================================================
  { ...xc90Base, trimName: "B5 AWD Momentum", driveType: "AWD", transmission: "8AT", lengthMm: 4950, widthMm: 1931, heightMm: 1776, weightKg: 2100, minTurningRadiusM: 5.9 },
  t(xc90Base, { trimName: "Recharge T8 PHEV", driveType: "AWD", transmission: "8AT", lengthMm: 4950, widthMm: 1931, heightMm: 1776, weightKg: 2340, minTurningRadiusM: 6.0 }),

  // ============================================================
  // ベントレー ベンテイガ 後期 (2020-)
  // ============================================================
  { ...bentaygaBase, trimName: "V8 4.0L ツインターボ", driveType: "AWD", transmission: "8AT", lengthMm: 5125, widthMm: 2010, heightMm: 1728, weightKg: 2412, minTurningRadiusM: 6.0 },
  t(bentaygaBase, { trimName: "Azure V8", driveType: "AWD", transmission: "8AT", lengthMm: 5125, widthMm: 2010, heightMm: 1728, weightKg: 2430, minTurningRadiusM: 6.0 }),
  t(bentaygaBase, { trimName: "S V8", driveType: "AWD", transmission: "8AT", lengthMm: 5125, widthMm: 2010, heightMm: 1710, weightKg: 2395, minTurningRadiusM: 6.0 }),
  t(bentaygaBase, { trimName: "Speed V8", driveType: "AWD", transmission: "8AT", lengthMm: 5125, widthMm: 2010, heightMm: 1710, weightKg: 2419, minTurningRadiusM: 6.0 }),
  t(bentaygaBase, { trimName: "Hybrid V6 3.0L PHEV", driveType: "AWD", transmission: "8AT", lengthMm: 5125, widthMm: 2010, heightMm: 1710, weightKg: 2510, minTurningRadiusM: 6.0 }),

  // ============================================================
  // ベントレー ベンテイガ EWB (2022-)
  // ============================================================
  { ...bentaygaEwbBase, trimName: "EWB V8", driveType: "AWD", transmission: "8AT", lengthMm: 5305, widthMm: 2010, heightMm: 1739, weightKg: 2520, minTurningRadiusM: 6.3 },
  t(bentaygaEwbBase, { trimName: "EWB Azure V8", driveType: "AWD", transmission: "8AT", lengthMm: 5305, widthMm: 2010, heightMm: 1739, weightKg: 2540, minTurningRadiusM: 6.3 }),

  // ============================================================
  // ベントレー ベンテイガ 前期 (2016-2020)
  // ============================================================
  t(bentayga1stBase, { trimName: "W12 6.0L ツインターボ", driveType: "AWD", transmission: "8AT", lengthMm: 5140, widthMm: 1998, heightMm: 1742, weightKg: 2530, minTurningRadiusM: 6.0 }),
  t(bentayga1stBase, { trimName: "V8 4.0L ツインターボ", driveType: "AWD", transmission: "8AT", lengthMm: 5140, widthMm: 1998, heightMm: 1742, weightKg: 2440, minTurningRadiusM: 6.0 }),

  // ============================================================
  // ランボルギーニ アヴェンタドール LP780-4 Ultimae (2021-2022)
  // ※重量はカーセンサーエッジ記載の整備重量を採用
  // ============================================================
  { ...aventadorBase, trimName: "LP780-4 ウルティメ", driveType: "AWD", transmission: "7AMT", lengthMm: 4870, widthMm: 2100, heightMm: 1135, weightKg: 1950, minTurningRadiusM: null },

  // ============================================================
  // ランボルギーニ レヴエルト (2024-)
  // ============================================================
  { ...revueltoBase, trimName: "レヴエルト", driveType: "AWD", transmission: "8DCT", lengthMm: 4947, widthMm: 2033, heightMm: 1160, weightKg: 1772, minTurningRadiusM: null },

  // ============================================================
  // ランボルギーニ ウラカン EVO (2019-2024)
  // ============================================================
  { ...huracanBase, trimName: "EVO", driveType: "AWD", transmission: "7DCT", lengthMm: 4520, widthMm: 1933, heightMm: 1165, weightKg: 1422, minTurningRadiusM: null },
  t(huracanBase, { trimName: "EVO RWD", driveType: "RWD", transmission: "7DCT", lengthMm: 4520, widthMm: 1933, heightMm: 1165, weightKg: 1389, minTurningRadiusM: null }),
  t(huracanBase, { trimName: "STO", driveType: "RWD", transmission: "7DCT", lengthMm: 4547, widthMm: 1945, heightMm: 1220, weightKg: 1510, minTurningRadiusM: null }),
  t(huracanBase, { trimName: "テクニカ", driveType: "RWD", transmission: "7DCT", lengthMm: 4567, widthMm: 1933, heightMm: 1165, weightKg: 1379, minTurningRadiusM: null }),

  // ============================================================
  // ランボルギーニ テメラリオ (2025-)
  // ============================================================
  { ...temerarioBase, trimName: "テメラリオ", driveType: "AWD", transmission: "8DCT", lengthMm: 4706, widthMm: 1996, heightMm: 1201, weightKg: 1690, minTurningRadiusM: null },

  // ============================================================
  // ポルシェ 911 992型 (2019-)
  // ※goo-netの最小回転半径は回転直径の誤記のため、公式PDF等から算出した値を使用
  // ============================================================
  { ...porsche911Base, trimName: "Carrera", driveType: "RWD", transmission: "8PDK", lengthMm: 4519, widthMm: 1852, heightMm: 1298, weightKg: 1580, minTurningRadiusM: 5.6 },
  t(porsche911Base, { trimName: "Carrera S", driveType: "RWD", transmission: "8PDK", lengthMm: 4519, widthMm: 1852, heightMm: 1300, weightKg: 1590, minTurningRadiusM: 5.6 }),
  t(porsche911Base, { trimName: "Carrera 4S", driveType: "AWD", transmission: "8PDK", lengthMm: 4519, widthMm: 1852, heightMm: 1300, weightKg: 1640, minTurningRadiusM: 5.6 }),
  t(porsche911Base, { trimName: "Turbo", driveType: "AWD", transmission: "8PDK", lengthMm: 4535, widthMm: 1900, heightMm: 1303, weightKg: 1640, minTurningRadiusM: 5.5 }),
  t(porsche911Base, { trimName: "Turbo S", driveType: "AWD", transmission: "8PDK", lengthMm: 4535, widthMm: 1900, heightMm: 1303, weightKg: 1710, minTurningRadiusM: 5.5 }),
  t(porsche911Base, { trimName: "GT3", driveType: "RWD", transmission: "7PDK", lengthMm: 4573, widthMm: 1852, heightMm: 1279, weightKg: 1435, minTurningRadiusM: 5.2 }),
  t(porsche911Base, { trimName: "GT3 RS", driveType: "RWD", transmission: "7PDK", lengthMm: 4572, widthMm: 1900, heightMm: 1322, weightKg: 1450, minTurningRadiusM: 5.25 }),

  // ============================================================
  // フェラーリ 458イタリア (2009-2015)
  // ※重量はカーセンサー/MOTA記載の車両重量を採用
  // ============================================================
  { ...ferrari458Base, trimName: "458イタリア", driveType: "RWD", transmission: "7DCT", lengthMm: 4527, widthMm: 1937, heightMm: 1213, weightKg: 1580, minTurningRadiusM: null },
  t(ferrari458Base, { trimName: "458スパイダー", driveType: "RWD", transmission: "7DCT", lengthMm: 4527, widthMm: 1937, heightMm: 1211, weightKg: 1430, minTurningRadiusM: null }),
  t(ferrari458Base, { trimName: "458スペチアーレ", driveType: "RWD", transmission: "7DCT", lengthMm: 4571, widthMm: 1951, heightMm: 1203, weightKg: 1395, minTurningRadiusM: null }),

  // ============================================================
  // フェラーリ 488 GTB/Spider (2015-2019)
  // ============================================================
  { ...ferrari488Base, trimName: "488 GTB", driveType: "RWD", transmission: "7DCT", lengthMm: 4568, widthMm: 1952, heightMm: 1213, weightKg: 1475, minTurningRadiusM: null },
  t(ferrari488Base, { trimName: "488 Spider", driveType: "RWD", transmission: "7DCT", lengthMm: 4568, widthMm: 1952, heightMm: 1211, weightKg: 1525, minTurningRadiusM: null }),
  t(ferrari488Base, { trimName: "488 Pista", driveType: "RWD", transmission: "7DCT", lengthMm: 4605, widthMm: 1975, heightMm: 1206, weightKg: 1280, minTurningRadiusM: null }),

  // ============================================================
  // フェラーリ F8トリブート (2019-2024)
  // ============================================================
  { ...ferrariF8Base, trimName: "F8トリブート", driveType: "RWD", transmission: "7DCT", lengthMm: 4611, widthMm: 1979, heightMm: 1206, weightKg: 1570, minTurningRadiusM: null },
  t(ferrariF8Base, { trimName: "F8スパイダー", driveType: "RWD", transmission: "7DCT", lengthMm: 4611, widthMm: 1979, heightMm: 1206, weightKg: 1640, minTurningRadiusM: null }),

  // ============================================================
  // フェラーリ 296 GTB (2022-)
  // ============================================================
  { ...ferrari296Base, trimName: "296 GTB", driveType: "RWD", transmission: "8DCT", lengthMm: 4565, widthMm: 1958, heightMm: 1187, weightKg: 1482, minTurningRadiusM: null },
  t(ferrari296Base, { trimName: "296 GTS", driveType: "RWD", transmission: "8DCT", lengthMm: 4565, widthMm: 1958, heightMm: 1191, weightKg: 1548, minTurningRadiusM: null }),

  // ============================================================
  // フェラーリ ローマ (2020-)
  // ============================================================
  { ...ferrariRomaBase, trimName: "ローマ", driveType: "RWD", transmission: "8DCT", lengthMm: 4656, widthMm: 1974, heightMm: 1301, weightKg: 1570, minTurningRadiusM: null },

  // ============================================================
  // フェラーリ 12チリンドリ (2024-)
  // ※全幅2,176mmはgoo-netカタログ値、重量1,560kgは乾燥重量
  // ============================================================
  { ...ferrari12CilindriBase, trimName: "12チリンドリ", driveType: "RWD", transmission: "8DCT", lengthMm: 4733, widthMm: 2176, heightMm: 1292, weightKg: 1560, minTurningRadiusM: null },

  // ============================================================
  // アストンマーティン DBX (2020-)
  // ============================================================
  { ...dbxBase, trimName: "4.0 V8", driveType: "AWD", transmission: "9AT", lengthMm: 5039, widthMm: 1998, heightMm: 1680, weightKg: 2245, minTurningRadiusM: 6.2 },
  t(dbxBase, { trimName: "707", driveType: "AWD", transmission: "9AT", lengthMm: 5039, widthMm: 1998, heightMm: 1680, weightKg: 2245, minTurningRadiusM: 6.2 }),

  // ============================================================
  // ランドローバー レンジローバー 5代目 (2022-)
  // ============================================================
  { ...rangeRoverBase, trimName: "SE D350 SWB", driveType: "AWD", transmission: "8AT", lengthMm: 5070, widthMm: 2010, heightMm: 1870, weightKg: 2550, minTurningRadiusM: 5.3 },
  t(rangeRoverBase, { trimName: "Autobiography D350 SWB", driveType: "AWD", transmission: "8AT", lengthMm: 5070, widthMm: 2010, heightMm: 1870, weightKg: 2630, minTurningRadiusM: 5.3 }),
  t(rangeRoverBase, { trimName: "HSE D350 LWB", driveType: "AWD", transmission: "8AT", lengthMm: 5270, widthMm: 2010, heightMm: 1870, weightKg: 2740, minTurningRadiusM: 5.6 }),
  t(rangeRoverBase, { trimName: "Autobiography P530 LWB", driveType: "AWD", transmission: "8AT", lengthMm: 5270, widthMm: 2010, heightMm: 1870, weightKg: 2840, minTurningRadiusM: 5.6 }),

  // ============================================================
  // ランドローバー ディフェンダー (2020-)
  // ============================================================
  { ...defenderBase, trimName: "90 P300", driveType: "AWD", transmission: "8AT", lengthMm: 4510, widthMm: 2000, heightMm: 1970, weightKg: 2090, minTurningRadiusM: 5.3 },
  t(defenderBase, { trimName: "90 V8 P525", driveType: "AWD", transmission: "8AT", lengthMm: 4510, widthMm: 2000, heightMm: 1970, weightKg: 2330, minTurningRadiusM: 5.3 }),
  t(defenderBase, { trimName: "110 P300", driveType: "AWD", transmission: "8AT", lengthMm: 4950, widthMm: 2000, heightMm: 1970, weightKg: 2280, minTurningRadiusM: 6.1 }),
  t(defenderBase, { trimName: "110 X D350", driveType: "AWD", transmission: "8AT", lengthMm: 4950, widthMm: 2000, heightMm: 1970, weightKg: 2530, minTurningRadiusM: 6.1 }),
  t(defenderBase, { trimName: "130 SE D300", driveType: "AWD", transmission: "8AT", lengthMm: 5280, widthMm: 2000, heightMm: 1970, weightKg: 2650, minTurningRadiusM: 6.1 }),

  // ============================================================
  // ランドローバー レンジローバースポーツ 3代目 (2022-)
  // ============================================================
  { ...rangeRoverSportBase, trimName: "Dynamic SE D300", driveType: "AWD", transmission: "8AT", lengthMm: 4960, widthMm: 2010, heightMm: 1820, weightKg: 2490, minTurningRadiusM: 6.1 },
  t(rangeRoverSportBase, { trimName: "Autobiography P400", driveType: "AWD", transmission: "8AT", lengthMm: 4960, widthMm: 2010, heightMm: 1820, weightKg: 2450, minTurningRadiusM: 6.1 }),
  t(rangeRoverSportBase, { trimName: "SV P635", driveType: "AWD", transmission: "8AT", lengthMm: 4970, widthMm: 2030, heightMm: 1820, weightKg: 2560, minTurningRadiusM: 5.3 }),

  // ============================================================
  // ランドローバー レンジローバーイヴォーク 2代目 (2019-)
  // ============================================================
  { ...evoqueBase, trimName: "S D200", driveType: "AWD", transmission: "9AT", lengthMm: 4380, widthMm: 1910, heightMm: 1650, weightKg: 1980, minTurningRadiusM: 5.5 },
  t(evoqueBase, { trimName: "Dynamic SE P200", driveType: "AWD", transmission: "9AT", lengthMm: 4380, widthMm: 1910, heightMm: 1650, weightKg: 1900, minTurningRadiusM: 5.5 }),
  t(evoqueBase, { trimName: "Autobiography P250", driveType: "AWD", transmission: "9AT", lengthMm: 4380, widthMm: 1910, heightMm: 1650, weightKg: 1920, minTurningRadiusM: 5.5 }),

  // ============================================================
  // ランドローバー レンジローバーヴェラール (2017-)
  // ============================================================
  { ...velarBase, trimName: "S D200", driveType: "AWD", transmission: "8AT", lengthMm: 4820, widthMm: 1930, heightMm: 1690, weightKg: 2070, minTurningRadiusM: 5.6 },
  t(velarBase, { trimName: "Dynamic SE P250", driveType: "AWD", transmission: "8AT", lengthMm: 4820, widthMm: 1930, heightMm: 1690, weightKg: 2010, minTurningRadiusM: 5.6 }),
  t(velarBase, { trimName: "S P400e PHEV", driveType: "AWD", transmission: "8AT", lengthMm: 4820, widthMm: 1930, heightMm: 1690, weightKg: 2310, minTurningRadiusM: 5.6 }),

  // ============================================================
  // Jeep ラングラー JL (2018-)
  // ============================================================
  { ...wranglerBase, trimName: "Sport 2ドア", driveType: "4WD", transmission: "8AT", lengthMm: 4320, widthMm: 1930, heightMm: 1840, weightKg: 1960, minTurningRadiusM: 5.3 },
  t(wranglerBase, { trimName: "Unlimited Sahara", driveType: "4WD", transmission: "8AT", lengthMm: 4870, widthMm: 1895, heightMm: 1845, weightKg: 2000, minTurningRadiusM: 6.2 }),
  t(wranglerBase, { trimName: "Unlimited Rubicon", driveType: "4WD", transmission: "8AT", lengthMm: 4870, widthMm: 1895, heightMm: 1845, weightKg: 1990, minTurningRadiusM: 6.2 }),
  t(wranglerBase, { trimName: "Unlimited High Altitude", driveType: "4WD", transmission: "8AT", lengthMm: 4870, widthMm: 1930, heightMm: 1855, weightKg: 2110, minTurningRadiusM: 6.2 }),

  // ============================================================
  // Jeep グランドチェロキー WL (2022-)
  // ============================================================
  { ...grandCherokeeBase, trimName: "Limited", driveType: "AWD", transmission: "8AT", lengthMm: 4900, widthMm: 1980, heightMm: 1810, weightKg: 2070, minTurningRadiusM: 6.0 },
  t(grandCherokeeBase, { trimName: "Summit", driveType: "AWD", transmission: "8AT", lengthMm: 4900, widthMm: 1980, heightMm: 1810, weightKg: 2070, minTurningRadiusM: 6.0 }),

  // ============================================================
  // Jeep グランドチェロキーL WL (2021-)
  // ============================================================
  { ...grandCherokeeLBase, trimName: "Limited", driveType: "AWD", transmission: "8AT", lengthMm: 5200, widthMm: 1980, heightMm: 1815, weightKg: 2170, minTurningRadiusM: 6.3 },
  t(grandCherokeeLBase, { trimName: "Summit Reserve", driveType: "AWD", transmission: "8AT", lengthMm: 5200, widthMm: 1980, heightMm: 1795, weightKg: 2250, minTurningRadiusM: 6.3 }),

  // ============================================================
  // 日産 GT-R R35 (2007-2024)
  // ============================================================
  { ...gtrBase, trimName: "Pure Edition", driveType: "AWD", transmission: "6AT", lengthMm: 4710, widthMm: 1895, heightMm: 1370, weightKg: 1760, minTurningRadiusM: 5.7 },
  t(gtrBase, { trimName: "Premium Edition", driveType: "AWD", transmission: "6AT", lengthMm: 4710, widthMm: 1895, heightMm: 1370, weightKg: 1760, minTurningRadiusM: 5.7 }),
  t(gtrBase, { trimName: "NISMO", driveType: "AWD", transmission: "6AT", lengthMm: 4700, widthMm: 1895, heightMm: 1370, weightKg: 1720, minTurningRadiusM: 5.7 }),
  t(gtrBase, { trimName: "Track edition", driveType: "AWD", transmission: "6AT", lengthMm: 4710, widthMm: 1895, heightMm: 1370, weightKg: 1760, minTurningRadiusM: 5.7 }),

  // ============================================================
  // トヨタ センチュリー SUV (2023-)
  // ============================================================
  { ...centuryBase, trimName: "ベースグレード", driveType: "AWD", transmission: "CVT", lengthMm: 5205, widthMm: 1990, heightMm: 1805, weightKg: 2570, minTurningRadiusM: 5.5 },

  // ============================================================
  // 三菱 デリカミニ (2023-)
  // ============================================================
  { ...delicaMiniBase, trimName: "T ターボ", driveType: "2WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1785, weightKg: 980, minTurningRadiusM: 4.5 },
  t(delicaMiniBase, { trimName: "T Premium ターボ", driveType: "2WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1785, weightKg: 990, minTurningRadiusM: 4.5 }),
  t(delicaMiniBase, { trimName: "G", driveType: "2WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1785, weightKg: 970, minTurningRadiusM: 4.5 }),
  t(delicaMiniBase, { trimName: "T ターボ", driveType: "4WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1815, weightKg: 1040, minTurningRadiusM: 4.9 }),
  t(delicaMiniBase, { trimName: "T Premium ターボ", driveType: "4WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1815, weightKg: 1050, minTurningRadiusM: 4.9 }),

  // ============================================================
  // スズキ フロンクス (2024-)
  // ============================================================
  { ...fronxBase, trimName: "ベースグレード", driveType: "2WD", transmission: "6AT", lengthMm: 3995, widthMm: 1765, heightMm: 1550, weightKg: 1070, minTurningRadiusM: 4.8 },
  t(fronxBase, { trimName: "ベースグレード", driveType: "4WD", transmission: "6AT", lengthMm: 3995, widthMm: 1765, heightMm: 1550, weightKg: 1130, minTurningRadiusM: 4.8 }),

  // ============================================================
  // レクサス LM (2023-)
  // ============================================================
  { ...lmBase, trimName: "LM500h Executive", driveType: "AWD", transmission: "8AT", lengthMm: 5125, widthMm: 1890, heightMm: 1955, weightKg: 2460, minTurningRadiusM: 5.9 },
  t(lmBase, { trimName: "LM500h", driveType: "2WD", transmission: "6AT", lengthMm: 5125, widthMm: 1890, heightMm: 1955, weightKg: 2440, minTurningRadiusM: 5.9 }),

  // ============================================================
  // レクサス LBX (2023-)
  // ============================================================
  { ...lbxBase, trimName: "Cool", driveType: "2WD", transmission: "CVT", lengthMm: 4190, widthMm: 1825, heightMm: 1545, weightKg: 1300, minTurningRadiusM: 5.2 },
  t(lbxBase, { trimName: "Relax", driveType: "2WD", transmission: "CVT", lengthMm: 4190, widthMm: 1825, heightMm: 1545, weightKg: 1310, minTurningRadiusM: 5.2 }),
  t(lbxBase, { trimName: "Morizo RR", driveType: "4WD", transmission: "8AT", lengthMm: 4190, widthMm: 1840, heightMm: 1535, weightKg: 1480, minTurningRadiusM: 5.4 }),

  // ============================================================
  // レクサス GX (2024-)
  // ============================================================
  { ...gxBase, trimName: "GX550 version L", driveType: "4WD", transmission: "10AT", lengthMm: 4960, widthMm: 1980, heightMm: 1920, weightKg: 2510, minTurningRadiusM: 6.0 },
  t(gxBase, { trimName: "GX550 Overtrail+", driveType: "4WD", transmission: "10AT", lengthMm: 4970, widthMm: 2000, heightMm: 1925, weightKg: 2480, minTurningRadiusM: 6.0 }),

  // ============================================================
  // レクサス RZ (2023-)
  // ============================================================
  { ...rzBase, trimName: "RZ300e", driveType: "2WD", transmission: "1速固定", lengthMm: 4805, widthMm: 1895, heightMm: 1635, weightKg: 1990, minTurningRadiusM: 5.6 },
  t(rzBase, { trimName: "RZ450e", driveType: "4WD", transmission: "1速固定", lengthMm: 4805, widthMm: 1895, heightMm: 1635, weightKg: 2100, minTurningRadiusM: 5.6 }),

  // ============================================================
  // レクサス IS 500 (2022-)
  // ============================================================
  { ...is500Base, trimName: "F SPORT Performance", driveType: "RWD", transmission: "8AT", lengthMm: 4760, widthMm: 1840, heightMm: 1435, weightKg: 1720, minTurningRadiusM: 5.2 },

  // ============================================================
  // トヨタ ハイラックス (2017-)
  // ============================================================
  { ...hiluxBase, trimName: "Z", driveType: "4WD", transmission: "6AT", lengthMm: 5325, widthMm: 1900, heightMm: 1800, weightKg: 2160, minTurningRadiusM: 6.4 },
  t(hiluxBase, { trimName: "Z GR SPORT", driveType: "4WD", transmission: "6AT", lengthMm: 5320, widthMm: 1900, heightMm: 1840, weightKg: 2110, minTurningRadiusM: 6.4 }),

  // ============================================================
  // ホンダ S2000 (1999-2009)
  // ============================================================
  { ...s2000Base, trimName: "ベースグレード", driveType: "RWD", transmission: "6MT", lengthMm: 4135, widthMm: 1750, heightMm: 1285, weightKg: 1240, minTurningRadiusM: 5.4 },
  t(s2000Base, { trimName: "Type S", driveType: "RWD", transmission: "6MT", lengthMm: 4135, widthMm: 1750, heightMm: 1285, weightKg: 1260, minTurningRadiusM: 5.4 }),

  // ============================================================
  // トヨタ スープラ A90 (2019-)
  // ============================================================
  { ...supraBase, trimName: "SZ 2.0", driveType: "RWD", transmission: "8AT", lengthMm: 4380, widthMm: 1865, heightMm: 1295, weightKg: 1410, minTurningRadiusM: 5.2 },
  t(supraBase, { trimName: "SZ-R 2.0", driveType: "RWD", transmission: "8AT", lengthMm: 4380, widthMm: 1865, heightMm: 1295, weightKg: 1460, minTurningRadiusM: 5.2 }),
  t(supraBase, { trimName: "RZ 3.0", driveType: "RWD", transmission: "8AT", lengthMm: 4380, widthMm: 1865, heightMm: 1295, weightKg: 1520, minTurningRadiusM: 5.2 }),

  // ============================================================
  // 日産 シルビア S15 (1999-2002)
  // ============================================================
  { ...silviaBase, trimName: "Spec S", driveType: "RWD", transmission: "5MT", lengthMm: 4445, widthMm: 1695, heightMm: 1285, weightKg: 1200, minTurningRadiusM: 4.8 },
  t(silviaBase, { trimName: "Spec R ターボ", driveType: "RWD", transmission: "6MT", lengthMm: 4445, widthMm: 1695, heightMm: 1285, weightKg: 1240, minTurningRadiusM: 4.9 }),

  // ============================================================
  // メルセデス・ベンツ Sクラス W223 (2021-)
  // ============================================================
  { ...sClassBase, trimName: "S400d 4MATIC", driveType: "AWD", transmission: "9AT", lengthMm: 5180, widthMm: 1920, heightMm: 1505, weightKg: 2090, minTurningRadiusM: 5.4 },
  t(sClassBase, { trimName: "S500 4MATIC", driveType: "AWD", transmission: "9AT", lengthMm: 5180, widthMm: 1920, heightMm: 1505, weightKg: 2050, minTurningRadiusM: 5.4 }),
  t(sClassBase, { trimName: "S580 4MATIC", driveType: "AWD", transmission: "9AT", lengthMm: 5180, widthMm: 1930, heightMm: 1505, weightKg: 2160, minTurningRadiusM: 5.4 }),

  // ============================================================
  // メルセデス・ベンツ Cクラス W206 (2021-)
  // ============================================================
  { ...cClassBase, trimName: "C200 アバンギャルド", driveType: "RWD", transmission: "9AT", lengthMm: 4755, widthMm: 1820, heightMm: 1435, weightKg: 1660, minTurningRadiusM: 5.2 },
  t(cClassBase, { trimName: "C220d アバンギャルド", driveType: "RWD", transmission: "9AT", lengthMm: 4755, widthMm: 1820, heightMm: 1435, weightKg: 1750, minTurningRadiusM: 5.2 }),
  t(cClassBase, { trimName: "AMG C43 4MATIC", driveType: "AWD", transmission: "9AT", lengthMm: 4785, widthMm: 1825, heightMm: 1450, weightKg: 1830, minTurningRadiusM: 5.7 }),
  t(cClassBase, { trimName: "AMG C63 S E PERFORMANCE", driveType: "AWD", transmission: "9AT", lengthMm: 4835, widthMm: 1900, heightMm: 1455, weightKg: 2130, minTurningRadiusM: 5.9 }),

  // ============================================================
  // メルセデス・ベンツ Vクラス (2019-)
  // ============================================================
  { ...vClassBase, trimName: "V220d アバンギャルド ロング", driveType: "RWD", transmission: "9AT", lengthMm: 5150, widthMm: 1930, heightMm: 1930, weightKg: 2420, minTurningRadiusM: 5.6 },
  t(vClassBase, { trimName: "V220d エクストラロング", driveType: "RWD", transmission: "9AT", lengthMm: 5370, widthMm: 1930, heightMm: 1880, weightKg: 2480, minTurningRadiusM: 6.0 }),

  // ============================================================
  // メルセデスAMG GT (2024-)
  // ============================================================
  { ...amgGtBase, trimName: "AMG GT 43 クーペ", driveType: "RWD", transmission: "8AT", lengthMm: 4730, widthMm: 1930, heightMm: 1365, weightKg: 1790, minTurningRadiusM: 6.1 },
  t(amgGtBase, { trimName: "AMG GT 63 4MATIC+ クーペ", driveType: "AWD", transmission: "9AT", lengthMm: 4730, widthMm: 1985, heightMm: 1355, weightKg: 1940, minTurningRadiusM: null }),

  // ============================================================
  // BMW i8 (2014-2020)
  // ============================================================
  { ...i8Base, trimName: "クーペ", driveType: "AWD", transmission: "6AT", lengthMm: 4690, widthMm: 1940, heightMm: 1300, weightKg: 1590, minTurningRadiusM: 5.8 },
  t(i8Base, { trimName: "ロードスター", driveType: "AWD", transmission: "8AT", lengthMm: 4690, widthMm: 1940, heightMm: 1290, weightKg: 1650, minTurningRadiusM: 5.8 }),

  // ============================================================
  // BMW M3 G80 (2021-)
  // ============================================================
  { ...m3Base, trimName: "M3 Competition", driveType: "RWD", transmission: "8AT", lengthMm: 4805, widthMm: 1905, heightMm: 1435, weightKg: 1740, minTurningRadiusM: 5.2 },
  t(m3Base, { trimName: "M3 Competition M xDrive", driveType: "AWD", transmission: "8AT", lengthMm: 4805, widthMm: 1905, heightMm: 1435, weightKg: 1800, minTurningRadiusM: 5.3 }),

  // ============================================================
  // ポルシェ タイカン (2020-)
  // ============================================================
  { ...taycanBase, trimName: "Taycan", driveType: "RWD", transmission: "2AT", lengthMm: 4965, widthMm: 1965, heightMm: 1380, weightKg: 2110, minTurningRadiusM: 5.85 },
  t(taycanBase, { trimName: "4S", driveType: "AWD", transmission: "2AT", lengthMm: 4965, widthMm: 1965, heightMm: 1380, weightKg: 2270, minTurningRadiusM: 5.85 }),
  t(taycanBase, { trimName: "Turbo", driveType: "AWD", transmission: "2AT", lengthMm: 4965, widthMm: 1965, heightMm: 1380, weightKg: 2300, minTurningRadiusM: 5.9 }),
  t(taycanBase, { trimName: "Turbo S", driveType: "AWD", transmission: "2AT", lengthMm: 4965, widthMm: 1965, heightMm: 1380, weightKg: 2310, minTurningRadiusM: 5.9 }),

  // ============================================================
  // アウディ A4 B9 (2016-)
  // ============================================================
  { ...a4Base, trimName: "35 TFSI", driveType: "2WD", transmission: "7DCT", lengthMm: 4760, widthMm: 1845, heightMm: 1410, weightKg: 1500, minTurningRadiusM: 5.5 },
  t(a4Base, { trimName: "45 TFSI quattro", driveType: "AWD", transmission: "7DCT", lengthMm: 4770, widthMm: 1845, heightMm: 1410, weightKg: 1630, minTurningRadiusM: 5.5 }),

  // ============================================================
  // アウディ R8 (2016-2024)
  // ============================================================
  { ...r8Base, trimName: "V10 5.2 FSI quattro", driveType: "AWD", transmission: "7DCT", lengthMm: 4430, widthMm: 1940, heightMm: 1240, weightKg: 1690, minTurningRadiusM: null },
  t(r8Base, { trimName: "V10 Performance", driveType: "AWD", transmission: "7DCT", lengthMm: 4430, widthMm: 1940, heightMm: 1240, weightKg: 1670, minTurningRadiusM: null }),

  // ============================================================
  // BYD ATTO 3 (2023-)
  // ============================================================
  { ...atto3Base, trimName: "ベースグレード", driveType: "2WD", transmission: "1速固定", lengthMm: 4455, widthMm: 1875, heightMm: 1615, weightKg: 1750, minTurningRadiusM: 5.35 },

  // ============================================================
  // BYD ドルフィン (2023-)
  // ============================================================
  { ...dolphinBase, trimName: "ドルフィン", driveType: "2WD", transmission: "1速固定", lengthMm: 4290, widthMm: 1770, heightMm: 1550, weightKg: 1520, minTurningRadiusM: 5.2 },
  t(dolphinBase, { trimName: "ロングレンジ", driveType: "2WD", transmission: "1速固定", lengthMm: 4290, widthMm: 1770, heightMm: 1550, weightKg: 1680, minTurningRadiusM: 5.2 }),

  // ============================================================
  // BYD シール (2024-)
  // ============================================================
  { ...sealBase, trimName: "ベースグレード", driveType: "RWD", transmission: "1速固定", lengthMm: 4800, widthMm: 1875, heightMm: 1460, weightKg: 2100, minTurningRadiusM: 5.9 },
  t(sealBase, { trimName: "AWD", driveType: "AWD", transmission: "1速固定", lengthMm: 4800, widthMm: 1875, heightMm: 1460, weightKg: 2230, minTurningRadiusM: 5.7 }),

  // ============================================================
  // シボレー コルベット C8 (2020-)
  // ============================================================
  { ...corvetteBase, trimName: "Stingray", driveType: "RWD", transmission: "8DCT", lengthMm: 4630, widthMm: 1940, heightMm: 1225, weightKg: 1670, minTurningRadiusM: null },
  t(corvetteBase, { trimName: "Z06", driveType: "RWD", transmission: "8DCT", lengthMm: 4685, widthMm: 2025, heightMm: 1225, weightKg: 1720, minTurningRadiusM: null }),

  // ============================================================
  // フォルクスワーゲン ゴルフ 8 (2021-)
  // ============================================================
  { ...golfBase, trimName: "eTSI Style", driveType: "2WD", transmission: "7DCT", lengthMm: 4295, widthMm: 1790, heightMm: 1475, weightKg: 1360, minTurningRadiusM: 5.1 },
  t(golfBase, { trimName: "GTI", driveType: "2WD", transmission: "7DCT", lengthMm: 4295, widthMm: 1790, heightMm: 1465, weightKg: 1430, minTurningRadiusM: 5.1 }),
  t(golfBase, { trimName: "R 4MOTION", driveType: "AWD", transmission: "7DCT", lengthMm: 4295, widthMm: 1790, heightMm: 1460, weightKg: 1510, minTurningRadiusM: 5.1 }),

  // ============================================================
  // フォルクスワーゲン T-Roc (2020-)
  // ============================================================
  { ...tRocBase, trimName: "TDI Style", driveType: "2WD", transmission: "7DCT", lengthMm: 4250, widthMm: 1825, heightMm: 1590, weightKg: 1430, minTurningRadiusM: 5.0 },
  t(tRocBase, { trimName: "TDI R-Line", driveType: "2WD", transmission: "7DCT", lengthMm: 4250, widthMm: 1825, heightMm: 1590, weightKg: 1430, minTurningRadiusM: 5.0 }),

  // ============================================================
  // フォルクスワーゲン ID.4 (2022-)
  // ============================================================
  { ...id4Base, trimName: "Lite", driveType: "RWD", transmission: "1速固定", lengthMm: 4585, widthMm: 1850, heightMm: 1640, weightKg: 1950, minTurningRadiusM: 5.4 },
  t(id4Base, { trimName: "Pro", driveType: "RWD", transmission: "1速固定", lengthMm: 4585, widthMm: 1850, heightMm: 1640, weightKg: 2140, minTurningRadiusM: 5.4 }),

  // ============================================================
  // マクラーレン 720S (2017-2024)
  // ============================================================
  { ...mclaren720sBase, trimName: "Coupe", driveType: "RWD", transmission: "7DCT", lengthMm: 4540, widthMm: 2060, heightMm: 1200, weightKg: 1419, minTurningRadiusM: null },
  t(mclaren720sBase, { trimName: "Spider", driveType: "RWD", transmission: "7DCT", lengthMm: 4540, widthMm: 2060, heightMm: 1190, weightKg: 1468, minTurningRadiusM: null }),

  // ============================================================
  // ルノー カングー 3代目 (2023-)
  // ============================================================
  { ...kangooBase, trimName: "Intens", driveType: "2WD", transmission: "7DCT", lengthMm: 4490, widthMm: 1860, heightMm: 1810, weightKg: 1560, minTurningRadiusM: 5.6 },
  t(kangooBase, { trimName: "Créatif ディーゼル", driveType: "2WD", transmission: "7DCT", lengthMm: 4490, widthMm: 1860, heightMm: 1810, weightKg: 1650, minTurningRadiusM: 5.6 }),

  // ============================================================
  // フィアット 500 (2008-)
  // ============================================================
  { ...fiat500Base, trimName: "1.2 Pop", driveType: "2WD", transmission: "5AT", lengthMm: 3570, widthMm: 1625, heightMm: 1515, weightKg: 990, minTurningRadiusM: 4.7 },
  t(fiat500Base, { trimName: "TwinAir Lounge", driveType: "2WD", transmission: "5AT", lengthMm: 3570, widthMm: 1625, heightMm: 1515, weightKg: 1040, minTurningRadiusM: 4.7 }),

  // ============================================================
  // アバルト 595 (2013-)
  // ============================================================
  { ...abarth595Base, trimName: "ベースグレード", driveType: "2WD", transmission: "5AMT", lengthMm: 3660, widthMm: 1625, heightMm: 1490, weightKg: 1120, minTurningRadiusM: null },
  t(abarth595Base, { trimName: "Competizione", driveType: "2WD", transmission: "5AMT", lengthMm: 3660, widthMm: 1630, heightMm: 1500, weightKg: 1120, minTurningRadiusM: null }),

  // ============================================================
  // アルピーヌ A110 (2018-)
  // ============================================================
  { ...a110Base, trimName: "Pure", driveType: "RWD", transmission: "7DCT", lengthMm: 4205, widthMm: 1800, heightMm: 1250, weightKg: 1120, minTurningRadiusM: 5.8 },
  t(a110Base, { trimName: "S", driveType: "RWD", transmission: "7DCT", lengthMm: 4205, widthMm: 1800, heightMm: 1250, weightKg: 1120, minTurningRadiusM: 5.8 }),
  t(a110Base, { trimName: "GT", driveType: "RWD", transmission: "7DCT", lengthMm: 4205, widthMm: 1800, heightMm: 1250, weightKg: 1130, minTurningRadiusM: 5.8 }),

  // ============================================================
  // ロータス エミーラ (2023-)
  // ============================================================
  { ...emiraBase, trimName: "V6 First Edition", driveType: "RWD", transmission: "6AT", lengthMm: 4413, widthMm: 1895, heightMm: 1226, weightKg: 1405, minTurningRadiusM: null },
  t(emiraBase, { trimName: "i4 First Edition", driveType: "RWD", transmission: "8DCT", lengthMm: 4413, widthMm: 1895, heightMm: 1226, weightKg: 1446, minTurningRadiusM: null }),

  // ============================================================
  // マセラティ グレカーレ (2023-)
  // ============================================================
  { ...grecaleBase, trimName: "GT", driveType: "AWD", transmission: "8AT", lengthMm: 4846, widthMm: 1948, heightMm: 1670, weightKg: 1870, minTurningRadiusM: 6.2 },
  t(grecaleBase, { trimName: "Modena", driveType: "AWD", transmission: "8AT", lengthMm: 4850, widthMm: 1980, heightMm: 1670, weightKg: 1920, minTurningRadiusM: 6.2 }),
  t(grecaleBase, { trimName: "Trofeo", driveType: "AWD", transmission: "8AT", lengthMm: 4860, widthMm: 1980, heightMm: 1660, weightKg: 2030, minTurningRadiusM: 6.2 }),

  // ============================================================
  // ヒョンデ IONIQ 5 (2022-)
  // ============================================================
  { ...ioniq5Base, trimName: "Voyage", driveType: "RWD", transmission: "1速固定", lengthMm: 4655, widthMm: 1890, heightMm: 1645, weightKg: 2010, minTurningRadiusM: 5.9 },
  t(ioniq5Base, { trimName: "Voyage AWD", driveType: "AWD", transmission: "1速固定", lengthMm: 4655, widthMm: 1890, heightMm: 1645, weightKg: 2110, minTurningRadiusM: 5.9 }),
  t(ioniq5Base, { trimName: "N", driveType: "AWD", transmission: "1速固定", lengthMm: 4715, widthMm: 1940, heightMm: 1625, weightKg: 2210, minTurningRadiusM: 6.21 }),

  // ============================================================
  // ボルボ EX30 (2024-)
  // ============================================================
  { ...ex30Base, trimName: "Single Motor", driveType: "RWD", transmission: "1速固定", lengthMm: 4235, widthMm: 1835, heightMm: 1550, weightKg: 1770, minTurningRadiusM: 5.4 },
  t(ex30Base, { trimName: "Twin Motor", driveType: "AWD", transmission: "1速固定", lengthMm: 4235, widthMm: 1835, heightMm: 1550, weightKg: 1880, minTurningRadiusM: 5.4 }),

  // ============================================================
  // トヨタ グランエース (2019-2024) 生産終了
  // ============================================================
  { ...granaceBase, trimName: "Premium 6人乗り", driveType: "2WD", transmission: "6AT", lengthMm: 5300, widthMm: 1970, heightMm: 1990, weightKg: 2740, minTurningRadiusM: 5.9 },
  t(granaceBase, { trimName: "G 8人乗り", driveType: "2WD", transmission: "6AT", lengthMm: 5300, widthMm: 1970, heightMm: 1990, weightKg: 2770, minTurningRadiusM: 5.9 }),

  // ============================================================
  // トヨタ ランドクルーザー70 復刻版 (2023-)
  // ============================================================
  { ...lc70Base, trimName: "AX", driveType: "4WD", transmission: "6AT", lengthMm: 4890, widthMm: 1870, heightMm: 1920, weightKg: 2300, minTurningRadiusM: 6.3 },

  // ============================================================
  // トヨタ クラウン エステート (2025-)
  // ============================================================
  { ...crownEstateBase, trimName: "Z HEV", driveType: "2WD", transmission: "CVT", lengthMm: 4930, widthMm: 1880, heightMm: 1625, weightKg: 1890, minTurningRadiusM: 5.4 },
  t(crownEstateBase, { trimName: "RS PHEV", driveType: "4WD", transmission: "CVT", lengthMm: 4930, widthMm: 1880, heightMm: 1625, weightKg: 2080, minTurningRadiusM: 5.4 }),

  // ============================================================
  // トヨタ ライズ (2019-)
  // ============================================================
  { ...raizeBase, trimName: "Z ガソリン", driveType: "2WD", transmission: "CVT", lengthMm: 3995, widthMm: 1695, heightMm: 1620, weightKg: 980, minTurningRadiusM: 4.9 },
  t(raizeBase, { trimName: "Z ガソリン", driveType: "4WD", transmission: "CVT", lengthMm: 3995, widthMm: 1695, heightMm: 1620, weightKg: 1050, minTurningRadiusM: 4.9 }),
  t(raizeBase, { trimName: "Z HEV", driveType: "2WD", transmission: "CVT", lengthMm: 3995, widthMm: 1695, heightMm: 1620, weightKg: 1070, minTurningRadiusM: 4.9 }),

  // ============================================================
  // トヨタ ルーミー (2016-)
  // ============================================================
  { ...roomyBase, trimName: "G", driveType: "2WD", transmission: "CVT", lengthMm: 3700, widthMm: 1670, heightMm: 1735, weightKg: 1080, minTurningRadiusM: 4.7 },
  t(roomyBase, { trimName: "G", driveType: "4WD", transmission: "CVT", lengthMm: 3700, widthMm: 1670, heightMm: 1735, weightKg: 1130, minTurningRadiusM: 4.7 }),
  t(roomyBase, { trimName: "カスタムG-T ターボ", driveType: "2WD", transmission: "CVT", lengthMm: 3705, widthMm: 1670, heightMm: 1735, weightKg: 1100, minTurningRadiusM: 4.7 }),

  // ============================================================
  // トヨタ カローラ セダン (2019-)
  // ============================================================
  { ...corollaBase, trimName: "G HEV", driveType: "2WD", transmission: "CVT", lengthMm: 4495, widthMm: 1745, heightMm: 1435, weightKg: 1350, minTurningRadiusM: 5.0 },
  t(corollaBase, { trimName: "G HEV", driveType: "4WD", transmission: "CVT", lengthMm: 4495, widthMm: 1745, heightMm: 1435, weightKg: 1410, minTurningRadiusM: 5.0 }),

  // ============================================================
  // トヨタ カローラ ツーリング (2019-)
  // ============================================================
  { ...corollaTouringBase, trimName: "G HEV", driveType: "2WD", transmission: "CVT", lengthMm: 4495, widthMm: 1745, heightMm: 1460, weightKg: 1370, minTurningRadiusM: 5.0 },
  t(corollaTouringBase, { trimName: "G HEV", driveType: "4WD", transmission: "CVT", lengthMm: 4495, widthMm: 1745, heightMm: 1460, weightKg: 1430, minTurningRadiusM: 5.0 }),

  // ============================================================
  // トヨタ カローラ クロス (2021-)
  // ============================================================
  { ...corollaCrossBase, trimName: "Z HEV", driveType: "2WD", transmission: "CVT", lengthMm: 4490, widthMm: 1825, heightMm: 1620, weightKg: 1400, minTurningRadiusM: 5.2 },
  t(corollaCrossBase, { trimName: "Z HEV", driveType: "4WD", transmission: "CVT", lengthMm: 4490, widthMm: 1825, heightMm: 1620, weightKg: 1490, minTurningRadiusM: 5.2 }),
  t(corollaCrossBase, { trimName: "GR SPORT HEV", driveType: "2WD", transmission: "CVT", lengthMm: 4460, widthMm: 1825, heightMm: 1600, weightKg: 1500, minTurningRadiusM: 5.2 }),

  // ============================================================
  // トヨタ カローラ スポーツ (2018-)
  // ============================================================
  { ...corollaSportBase, trimName: "G HEV", driveType: "2WD", transmission: "CVT", lengthMm: 4375, widthMm: 1790, heightMm: 1460, weightKg: 1360, minTurningRadiusM: 5.0 },
  t(corollaSportBase, { trimName: "G Z HEV", driveType: "2WD", transmission: "CVT", lengthMm: 4375, widthMm: 1790, heightMm: 1460, weightKg: 1390, minTurningRadiusM: 5.0 }),

  // ============================================================
  // トヨタ GRヤリス (2020-)
  // ============================================================
  { ...grYarisBase, trimName: "RZ", driveType: "4WD", transmission: "6MT", lengthMm: 3995, widthMm: 1805, heightMm: 1455, weightKg: 1280, minTurningRadiusM: 5.6 },
  t(grYarisBase, { trimName: "RZ", driveType: "4WD", transmission: "8AT", lengthMm: 3995, widthMm: 1805, heightMm: 1455, weightKg: 1300, minTurningRadiusM: 5.6 }),

  // ============================================================
  // 日産 エルグランド E52 (2010-)
  // ============================================================
  { ...elgrandBase, trimName: "250 ハイウェイスター", driveType: "2WD", transmission: "CVT", lengthMm: 4965, widthMm: 1850, heightMm: 1815, weightKg: 1940, minTurningRadiusM: 5.7 },
  t(elgrandBase, { trimName: "250 ハイウェイスター", driveType: "4WD", transmission: "CVT", lengthMm: 4965, widthMm: 1850, heightMm: 1815, weightKg: 2010, minTurningRadiusM: 5.7 }),
  t(elgrandBase, { trimName: "350 ハイウェイスター", driveType: "2WD", transmission: "7AT", lengthMm: 4965, widthMm: 1850, heightMm: 1815, weightKg: 2050, minTurningRadiusM: 5.7 }),
  t(elgrandBase, { trimName: "350 ハイウェイスター", driveType: "4WD", transmission: "7AT", lengthMm: 4965, widthMm: 1850, heightMm: 1815, weightKg: 2110, minTurningRadiusM: 5.7 }),

  // ============================================================
  // 日産 ノート E13 (2020-)
  // ============================================================
  { ...noteBase, trimName: "X e-POWER", driveType: "2WD", transmission: "e-POWER", lengthMm: 4045, widthMm: 1695, heightMm: 1520, weightKg: 1230, minTurningRadiusM: 4.9 },
  t(noteBase, { trimName: "X FOUR e-POWER", driveType: "4WD", transmission: "e-POWER", lengthMm: 4045, widthMm: 1695, heightMm: 1520, weightKg: 1340, minTurningRadiusM: 4.9 }),

  // ============================================================
  // 日産 ノート オーラ FE13 (2021-)
  // ============================================================
  { ...noteAuraBase, trimName: "G e-POWER", driveType: "2WD", transmission: "e-POWER", lengthMm: 4045, widthMm: 1735, heightMm: 1525, weightKg: 1260, minTurningRadiusM: 5.2 },
  t(noteAuraBase, { trimName: "G FOUR e-POWER", driveType: "4WD", transmission: "e-POWER", lengthMm: 4045, widthMm: 1735, heightMm: 1525, weightKg: 1370, minTurningRadiusM: 5.2 }),
  t(noteAuraBase, { trimName: "NISMO", driveType: "2WD", transmission: "e-POWER", lengthMm: 4120, widthMm: 1735, heightMm: 1505, weightKg: 1270, minTurningRadiusM: 5.2 }),

  // ============================================================
  // 日産 ルークス (2020-)
  // ============================================================
  { ...rooxBase, trimName: "ハイウェイスター", driveType: "2WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1780, weightKg: 970, minTurningRadiusM: 4.5 },
  t(rooxBase, { trimName: "ハイウェイスター", driveType: "4WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1800, weightKg: 1030, minTurningRadiusM: 4.5 }),
  t(rooxBase, { trimName: "ハイウェイスター ProPILOT", driveType: "2WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1785, weightKg: 990, minTurningRadiusM: 4.5 }),

  // ============================================================
  // ホンダ フィット 4代目 GR系 (2020-)
  // ============================================================
  { ...fitBase, trimName: "ベーシック e:HEV", driveType: "2WD", transmission: "e:HEV", lengthMm: 3995, widthMm: 1695, heightMm: 1515, weightKg: 1180, minTurningRadiusM: 4.9 },
  t(fitBase, { trimName: "ホーム e:HEV", driveType: "2WD", transmission: "e:HEV", lengthMm: 3995, widthMm: 1695, heightMm: 1540, weightKg: 1200, minTurningRadiusM: 4.9 }),
  t(fitBase, { trimName: "CROSSTAR e:HEV", driveType: "2WD", transmission: "e:HEV", lengthMm: 4095, widthMm: 1725, heightMm: 1565, weightKg: 1210, minTurningRadiusM: 5.2 }),
  t(fitBase, { trimName: "CROSSTAR e:HEV", driveType: "4WD", transmission: "e:HEV", lengthMm: 4095, widthMm: 1725, heightMm: 1570, weightKg: 1280, minTurningRadiusM: 5.2 }),

  // ============================================================
  // ホンダ シビック FL系 (2021-)
  // ============================================================
  { ...civicBase, trimName: "EX ガソリン", driveType: "2WD", transmission: "CVT", lengthMm: 4550, widthMm: 1800, heightMm: 1415, weightKg: 1370, minTurningRadiusM: 5.7 },
  t(civicBase, { trimName: "e:HEV", driveType: "2WD", transmission: "e:HEV", lengthMm: 4560, widthMm: 1800, heightMm: 1410, weightKg: 1460, minTurningRadiusM: 5.7 }),

  // ============================================================
  // ホンダ シビック タイプR FL5 (2022-)
  // ============================================================
  { ...civicTypeRBase, trimName: "タイプR", driveType: "2WD", transmission: "6MT", lengthMm: 4595, widthMm: 1890, heightMm: 1405, weightKg: 1430, minTurningRadiusM: 5.9 },

  // ============================================================
  // スバル レヴォーグ 2代目 VN5 (2020-)
  // ============================================================
  { ...levorgBase, trimName: "GT-H 1.8L", driveType: "AWD", transmission: "CVT", lengthMm: 4755, widthMm: 1795, heightMm: 1500, weightKg: 1580, minTurningRadiusM: 5.5 },
  t(levorgBase, { trimName: "STI Sport 1.8L", driveType: "AWD", transmission: "CVT", lengthMm: 4755, widthMm: 1795, heightMm: 1500, weightKg: 1600, minTurningRadiusM: 5.5 }),
  t(levorgBase, { trimName: "STI Sport R 2.4L", driveType: "AWD", transmission: "CVT", lengthMm: 4755, widthMm: 1795, heightMm: 1500, weightKg: 1640, minTurningRadiusM: 5.5 }),

  // ============================================================
  // スバル レヴォーグ レイバック (2023-)
  // ============================================================
  { ...levorgLaybackBase, trimName: "Limited EX 1.8L", driveType: "AWD", transmission: "CVT", lengthMm: 4770, widthMm: 1820, heightMm: 1570, weightKg: 1600, minTurningRadiusM: 5.5 },

  // ============================================================
  // マツダ MAZDA2 DJ系 (2014-)
  // ============================================================
  { ...mazda2Base, trimName: "15C 2WD", driveType: "2WD", transmission: "6AT", lengthMm: 4080, widthMm: 1695, heightMm: 1500, weightKg: 1080, minTurningRadiusM: 4.7 },
  t(mazda2Base, { trimName: "15C 4WD", driveType: "4WD", transmission: "6AT", lengthMm: 4080, widthMm: 1695, heightMm: 1550, weightKg: 1170, minTurningRadiusM: 4.7 }),
  t(mazda2Base, { trimName: "XD 1.5D", driveType: "2WD", transmission: "6AT", lengthMm: 4080, widthMm: 1695, heightMm: 1525, weightKg: 1130, minTurningRadiusM: 4.7 }),

  // ============================================================
  // マツダ MAZDA3 ファストバック BP系 (2019-)
  // ============================================================
  { ...mazda3FbBase, trimName: "20S 2.0L", driveType: "2WD", transmission: "6AT", lengthMm: 4460, widthMm: 1795, heightMm: 1440, weightKg: 1360, minTurningRadiusM: 5.3 },
  t(mazda3FbBase, { trimName: "XD 1.8D", driveType: "2WD", transmission: "6AT", lengthMm: 4460, widthMm: 1795, heightMm: 1440, weightKg: 1420, minTurningRadiusM: 5.3 }),
  t(mazda3FbBase, { trimName: "XD 1.8D", driveType: "4WD", transmission: "6AT", lengthMm: 4460, widthMm: 1795, heightMm: 1440, weightKg: 1480, minTurningRadiusM: 5.3 }),

  // ============================================================
  // マツダ MAZDA3 セダン BP系 (2019-)
  // ============================================================
  { ...mazda3SedanBase, trimName: "20S 2.0L", driveType: "2WD", transmission: "6AT", lengthMm: 4660, widthMm: 1795, heightMm: 1445, weightKg: 1380, minTurningRadiusM: 5.3 },

  // ============================================================
  // スズキ スペーシア 3代目 (2023-)
  // ============================================================
  { ...spaciaBase, trimName: "HYBRID G", driveType: "2WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1785, weightKg: 860, minTurningRadiusM: 4.4 },
  t(spaciaBase, { trimName: "HYBRID G", driveType: "4WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1785, weightKg: 920, minTurningRadiusM: 4.4 }),
  t(spaciaBase, { trimName: "カスタム HYBRID GS ターボ", driveType: "2WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1785, weightKg: 910, minTurningRadiusM: 4.4 }),

  // ============================================================
  // スズキ ハスラー 2代目 (2020-)
  // ============================================================
  { ...hustlerBase, trimName: "HYBRID G", driveType: "2WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1680, weightKg: 820, minTurningRadiusM: 4.6 },
  t(hustlerBase, { trimName: "HYBRID G", driveType: "4WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1680, weightKg: 870, minTurningRadiusM: 4.6 }),
  t(hustlerBase, { trimName: "HYBRID Gターボ", driveType: "2WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1680, weightKg: 840, minTurningRadiusM: 4.6 }),

  // ============================================================
  // スズキ ワゴンR 6代目 (2017-)
  // ============================================================
  { ...wagonRBase, trimName: "HYBRID FX", driveType: "2WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1650, weightKg: 780, minTurningRadiusM: 4.4 },
  t(wagonRBase, { trimName: "HYBRID FX", driveType: "4WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1650, weightKg: 830, minTurningRadiusM: 4.4 }),

  // ============================================================
  // スズキ アルト 9代目 (2021-)
  // ============================================================
  { ...altoBase, trimName: "HYBRID S", driveType: "2WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1525, weightKg: 700, minTurningRadiusM: 4.4 },
  t(altoBase, { trimName: "HYBRID S", driveType: "4WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1525, weightKg: 740, minTurningRadiusM: 4.4 }),

  // ============================================================
  // ダイハツ タント 4代目 (2019-)
  // ============================================================
  { ...tantoBase, trimName: "X", driveType: "2WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1755, weightKg: 900, minTurningRadiusM: 4.4 },
  t(tantoBase, { trimName: "X", driveType: "4WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1775, weightKg: 950, minTurningRadiusM: 4.4 }),
  t(tantoBase, { trimName: "カスタムRS ターボ", driveType: "2WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1755, weightKg: 920, minTurningRadiusM: 4.4 }),

  // ============================================================
  // ダイハツ ムーヴ 新型 (2025-)
  // ============================================================
  { ...moveBase, trimName: "X", driveType: "2WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1655, weightKg: 860, minTurningRadiusM: 4.4 },
  t(moveBase, { trimName: "X", driveType: "4WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1655, weightKg: 910, minTurningRadiusM: 4.4 }),

  // ============================================================
  // ダイハツ タフト (2020-)
  // ============================================================
  { ...taftBase, trimName: "G", driveType: "2WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1630, weightKg: 830, minTurningRadiusM: 4.8 },
  t(taftBase, { trimName: "Gターボ", driveType: "4WD", transmission: "CVT", lengthMm: 3395, widthMm: 1475, heightMm: 1630, weightKg: 890, minTurningRadiusM: 4.8 }),

  // ============================================================
  // メルセデス・ベンツ GLE W167 (2019-)
  // ============================================================
  { ...gleBase, trimName: "GLE 300d 4MATIC", driveType: "4WD", transmission: "9AT", lengthMm: 4925, widthMm: 2020, heightMm: 1795, weightKg: 2320, minTurningRadiusM: 5.9 },
  t(gleBase, { trimName: "GLE 450d 4MATIC スポーツ", driveType: "4WD", transmission: "9AT", lengthMm: 4925, widthMm: 2020, heightMm: 1780, weightKg: 2480, minTurningRadiusM: 5.9 }),

  // ============================================================
  // メルセデス・ベンツ GLE クーペ C167 (2020-)
  // ============================================================
  { ...gleCoupeBase, trimName: "GLE 450d 4MATIC クーペ", driveType: "4WD", transmission: "9AT", lengthMm: 4955, widthMm: 2020, heightMm: 1715, weightKg: 2370, minTurningRadiusM: 5.9 },

  // ============================================================
  // メルセデス・ベンツ EQS SUV (2023-)
  // ============================================================
  { ...eqsSuvBase, trimName: "EQS 450 4MATIC SUV", driveType: "4WD", transmission: "1速固定", lengthMm: 5130, widthMm: 2035, heightMm: 1725, weightKg: 2880, minTurningRadiusM: 5.9 },

  // ============================================================
  // メルセデス・ベンツ EQE SUV (2024-)
  // ============================================================
  { ...eqeSuvBase, trimName: "EQE 350 4MATIC SUV", driveType: "4WD", transmission: "1速固定", lengthMm: 4880, widthMm: 2030, heightMm: 1670, weightKg: 2630, minTurningRadiusM: 5.6 },

  // ============================================================
  // メルセデス・ベンツ Eクラス W214 (2024-)
  // ============================================================
  { ...eClassBase, trimName: "E 200 アバンギャルド", driveType: "2WD", transmission: "9AT", lengthMm: 4960, widthMm: 1880, heightMm: 1475, weightKg: 1790, minTurningRadiusM: 5.5 },
  t(eClassBase, { trimName: "E 220d スポーツ", driveType: "2WD", transmission: "9AT", lengthMm: 4960, widthMm: 1880, heightMm: 1475, weightKg: 1890, minTurningRadiusM: 5.5 }),
  t(eClassBase, { trimName: "E 350e スポーツ PHEV", driveType: "2WD", transmission: "9AT", lengthMm: 4960, widthMm: 1880, heightMm: 1485, weightKg: 2170, minTurningRadiusM: 5.5 }),

  // ============================================================
  // メルセデス・ベンツ Aクラス W177 (2018-)
  // ============================================================
  { ...aClassBase, trimName: "A 180", driveType: "2WD", transmission: "7DCT", lengthMm: 4440, widthMm: 1800, heightMm: 1420, weightKg: 1380, minTurningRadiusM: 5.2 },

  // ============================================================
  // メルセデス・ベンツ Bクラス W247 (2019-)
  // ============================================================
  { ...bClassBase, trimName: "B 180", driveType: "2WD", transmission: "7DCT", lengthMm: 4425, widthMm: 1795, heightMm: 1565, weightKg: 1470, minTurningRadiusM: 5.2 },
  t(bClassBase, { trimName: "B 200d", driveType: "2WD", transmission: "8DCT", lengthMm: 4425, widthMm: 1795, heightMm: 1565, weightKg: 1550, minTurningRadiusM: 5.2 }),

  // ============================================================
  // メルセデス・ベンツ GLA H247 (2020-)
  // ============================================================
  { ...glaBase, trimName: "GLA 180", driveType: "2WD", transmission: "7DCT", lengthMm: 4415, widthMm: 1835, heightMm: 1620, weightKg: 1550, minTurningRadiusM: 5.4 },
  t(glaBase, { trimName: "GLA 200d 4MATIC", driveType: "4WD", transmission: "8DCT", lengthMm: 4415, widthMm: 1835, heightMm: 1620, weightKg: 1710, minTurningRadiusM: 5.4 }),

  // ============================================================
  // メルセデス・ベンツ GLB X247 (2020-)
  // ============================================================
  { ...glbBase, trimName: "GLB 180", driveType: "2WD", transmission: "7DCT", lengthMm: 4660, widthMm: 1845, heightMm: 1700, weightKg: 1670, minTurningRadiusM: 5.5 },
  t(glbBase, { trimName: "GLB 200d 4MATIC", driveType: "4WD", transmission: "8DCT", lengthMm: 4660, widthMm: 1845, heightMm: 1700, weightKg: 1820, minTurningRadiusM: 5.5 }),

  // ============================================================
  // BMW 7シリーズ G70 (2022-)
  // ============================================================
  { ...bmw7Base, trimName: "740i エクセレンス", driveType: "2WD", transmission: "8AT", lengthMm: 5390, widthMm: 1950, heightMm: 1545, weightKg: 2120, minTurningRadiusM: 6.0 },
  t(bmw7Base, { trimName: "740d xDrive Mスポーツ", driveType: "AWD", transmission: "8AT", lengthMm: 5390, widthMm: 1950, heightMm: 1545, weightKg: 2230, minTurningRadiusM: 6.0 }),

  // ============================================================
  // BMW X6 G06 (2019-)
  // ============================================================
  { ...x6Base, trimName: "xDrive 35d Mスポーツ", driveType: "AWD", transmission: "8AT", lengthMm: 4955, widthMm: 2005, heightMm: 1695, weightKg: 2270, minTurningRadiusM: 5.9 },
  t(x6Base, { trimName: "M60i xDrive", driveType: "AWD", transmission: "8AT", lengthMm: 4955, widthMm: 2005, heightMm: 1695, weightKg: 2340, minTurningRadiusM: 5.9 }),

  // ============================================================
  // BMW iX (2022-)
  // ============================================================
  { ...ixBase, trimName: "xDrive60 Mスポーツ", driveType: "AWD", transmission: "1速固定", lengthMm: 4965, widthMm: 1965, heightMm: 1695, weightKg: 2500, minTurningRadiusM: 5.9 },
  t(ixBase, { trimName: "M70 xDrive", driveType: "AWD", transmission: "1速固定", lengthMm: 4965, widthMm: 1965, heightMm: 1695, weightKg: 2640, minTurningRadiusM: 5.9 }),

  // ============================================================
  // BMW X1 U11 (2022-)
  // ============================================================
  { ...x1Base, trimName: "sDrive18i Mスポーツ", driveType: "2WD", transmission: "7DCT", lengthMm: 4500, widthMm: 1835, heightMm: 1625, weightKg: 1575, minTurningRadiusM: 5.4 },
  t(x1Base, { trimName: "xDrive20d Mスポーツ", driveType: "AWD", transmission: "7DCT", lengthMm: 4500, widthMm: 1845, heightMm: 1620, weightKg: 1740, minTurningRadiusM: 5.4 }),

  // ============================================================
  // BMW 1シリーズ F70 (2025-)
  // ============================================================
  { ...bmw1Base, trimName: "120 Mスポーツ", driveType: "2WD", transmission: "7DCT", lengthMm: 4370, widthMm: 1800, heightMm: 1465, weightKg: 1460, minTurningRadiusM: 5.4 },
  t(bmw1Base, { trimName: "M135 xDrive", driveType: "AWD", transmission: "8AT", lengthMm: 4370, widthMm: 1800, heightMm: 1450, weightKg: 1570, minTurningRadiusM: 5.4 }),

  // ============================================================
  // BMW 2シリーズ グランクーペ F74 (2025-)
  // ============================================================
  { ...bmw2gcBase, trimName: "220 Mスポーツ", driveType: "2WD", transmission: "7DCT", lengthMm: 4550, widthMm: 1800, heightMm: 1435, weightKg: 1490, minTurningRadiusM: 5.4 },
  t(bmw2gcBase, { trimName: "M235 xDrive", driveType: "AWD", transmission: "8AT", lengthMm: 4550, widthMm: 1800, heightMm: 1435, weightKg: 1590, minTurningRadiusM: 5.4 }),

  // ============================================================
  // BMW 2シリーズ アクティブツアラー U06 (2022-)
  // ============================================================
  { ...bmw2atBase, trimName: "218i Exclusive", driveType: "2WD", transmission: "7DCT", lengthMm: 4385, widthMm: 1825, heightMm: 1580, weightKg: 1460, minTurningRadiusM: 5.4 },
  t(bmw2atBase, { trimName: "218i M Sport", driveType: "2WD", transmission: "7DCT", lengthMm: 4385, widthMm: 1825, heightMm: 1565, weightKg: 1460, minTurningRadiusM: 5.4 }),

  // ============================================================
  // アウディ Q8 (2019-)
  // ============================================================
  { ...q8Base, trimName: "55 TFSI クワトロ S line", driveType: "AWD", transmission: "8AT", lengthMm: 4995, widthMm: 1995, heightMm: 1705, weightKg: 2140, minTurningRadiusM: 5.9 },

  // ============================================================
  // アウディ Q8 e-tron (2023-)
  // ============================================================
  { ...q8EtronBase, trimName: "50 クワトロ S line", driveType: "AWD", transmission: "1速固定", lengthMm: 4915, widthMm: 1935, heightMm: 1635, weightKg: 2520, minTurningRadiusM: 5.9 },
  t(q8EtronBase, { trimName: "55 クワトロ S line", driveType: "AWD", transmission: "1速固定", lengthMm: 4915, widthMm: 1935, heightMm: 1619, weightKg: 2640, minTurningRadiusM: 5.9 }),

  // ============================================================
  // アウディ A8 D5 (2018-)
  // ============================================================
  { ...a8Base, trimName: "55 TFSI クワトロ", driveType: "AWD", transmission: "8AT", lengthMm: 5170, widthMm: 1945, heightMm: 1470, weightKg: 2040, minTurningRadiusM: 5.9 },
  t(a8Base, { trimName: "A8 L 60 TFSI クワトロ", driveType: "AWD", transmission: "8AT", lengthMm: 5300, widthMm: 1945, heightMm: 1485, weightKg: 2170, minTurningRadiusM: 5.9 }),

  // ============================================================
  // アウディ e-tron GT (2022-)
  // ============================================================
  { ...etronGtBase, trimName: "S e-tron GT", driveType: "AWD", transmission: "2速AT", lengthMm: 4990, widthMm: 1965, heightMm: 1415, weightKg: 2280, minTurningRadiusM: 5.6 },
  t(etronGtBase, { trimName: "RS e-tron GT", driveType: "AWD", transmission: "2速AT", lengthMm: 4990, widthMm: 1965, heightMm: 1395, weightKg: 2320, minTurningRadiusM: 5.6 }),

  // ============================================================
  // アウディ A3 8Y (2021-)
  // ============================================================
  { ...a3Base, trimName: "Sportback 30 TFSI", driveType: "2WD", transmission: "7DCT", lengthMm: 4340, widthMm: 1820, heightMm: 1430, weightKg: 1350, minTurningRadiusM: 5.1 },
  t(a3Base, { trimName: "Sportback 35 TFSI S line", driveType: "2WD", transmission: "7DCT", lengthMm: 4340, widthMm: 1820, heightMm: 1430, weightKg: 1400, minTurningRadiusM: 5.1 }),

  // ============================================================
  // キャデラック エスカレード 5代目 (2021-)
  // ============================================================
  { ...escaladeBase, trimName: "プラチナム", driveType: "4WD", transmission: "10AT", lengthMm: 5400, widthMm: 2065, heightMm: 1930, weightKg: 2780, minTurningRadiusM: 6.4 },
  t(escaladeBase, { trimName: "スポーツ", driveType: "4WD", transmission: "10AT", lengthMm: 5400, widthMm: 2065, heightMm: 1930, weightKg: 2780, minTurningRadiusM: 6.4 }),

  // ============================================================
  // レクサス LS 5代目 (2017-)
  // ============================================================
  { ...lsBase, trimName: "LS 500h", driveType: "2WD", transmission: "CVT", lengthMm: 5235, widthMm: 1900, heightMm: 1450, weightKg: 2270, minTurningRadiusM: 5.6 },
  t(lsBase, { trimName: "LS 500h", driveType: "AWD", transmission: "CVT", lengthMm: 5235, widthMm: 1900, heightMm: 1460, weightKg: 2320, minTurningRadiusM: 5.9 }),

  // ============================================================
  // レクサス ES 7代目 (2018-)
  // ============================================================
  { ...esBase, trimName: "ES 300h", driveType: "2WD", transmission: "CVT", lengthMm: 4975, widthMm: 1865, heightMm: 1445, weightKg: 1680, minTurningRadiusM: 5.8 },
  t(esBase, { trimName: "ES 300h F SPORT", driveType: "2WD", transmission: "CVT", lengthMm: 4975, widthMm: 1865, heightMm: 1445, weightKg: 1730, minTurningRadiusM: 5.8 }),

  // ============================================================
  // マセラティ レヴァンテ (2016-2024) 生産終了
  // ============================================================
  { ...levanteBase, trimName: "GT ハイブリッド", driveType: "AWD", transmission: "8AT", lengthMm: 5020, widthMm: 1981, heightMm: 1698, weightKg: 2109, minTurningRadiusM: 6.0 },
  t(levanteBase, { trimName: "トロフェオ V8", driveType: "AWD", transmission: "8AT", lengthMm: 5020, widthMm: 1981, heightMm: 1693, weightKg: 2340, minTurningRadiusM: 6.0 }),

  // ============================================================
  // ランボルギーニ ウルス SE (2024-)
  // ============================================================
  { ...urusSeBase, trimName: "SE PHEV", driveType: "AWD", transmission: "8AT", lengthMm: 5123, widthMm: 2022, heightMm: 1638, weightKg: 2450, minTurningRadiusM: 6.0 },

  // ============================================================
  // フォルクスワーゲン ティグアン 3代目 (2024-)
  // ============================================================
  { ...tiguanBase, trimName: "eTSI エレガンス", driveType: "2WD", transmission: "7DCT", lengthMm: 4545, widthMm: 1840, heightMm: 1655, weightKg: 1600, minTurningRadiusM: 5.4 },
  t(tiguanBase, { trimName: "TDI 4MOTION Rライン", driveType: "4WD", transmission: "7DCT", lengthMm: 4545, widthMm: 1860, heightMm: 1655, weightKg: 1750, minTurningRadiusM: 5.4 }),

  // ============================================================
  // フォルクスワーゲン ポロ AW (2018-)
  // ============================================================
  { ...poloBase, trimName: "TSI コンフォートライン", driveType: "2WD", transmission: "7DCT", lengthMm: 4085, widthMm: 1750, heightMm: 1450, weightKg: 1170, minTurningRadiusM: 5.1 },
  t(poloBase, { trimName: "GTI", driveType: "2WD", transmission: "7DCT", lengthMm: 4085, widthMm: 1750, heightMm: 1450, weightKg: 1280, minTurningRadiusM: 5.1 }),

  // ============================================================
  // フォルクスワーゲン T-Cross (2019-)
  // ============================================================
  { ...tCrossBase, trimName: "TSI アクティブ", driveType: "2WD", transmission: "7DCT", lengthMm: 4115, widthMm: 1760, heightMm: 1580, weightKg: 1260, minTurningRadiusM: 5.1 },

  // ============================================================
  // フォルクスワーゲン パサート B9 (2024-)
  // ============================================================
  { ...passatBase, trimName: "TSI エレガンス", driveType: "2WD", transmission: "7DCT", lengthMm: 4915, widthMm: 1850, heightMm: 1500, weightKg: 1570, minTurningRadiusM: 5.5 },
  t(passatBase, { trimName: "TDI 4MOTION Rライン", driveType: "4WD", transmission: "7DCT", lengthMm: 4915, widthMm: 1850, heightMm: 1500, weightKg: 1830, minTurningRadiusM: 5.5 }),

  // ============================================================
  // ボルボ XC40 (2018-)
  // ============================================================
  { ...xc40Base, trimName: "B3", driveType: "2WD", transmission: "8AT", lengthMm: 4425, widthMm: 1875, heightMm: 1660, weightKg: 1660, minTurningRadiusM: 5.7 },
  t(xc40Base, { trimName: "B4 AWD", driveType: "AWD", transmission: "8AT", lengthMm: 4425, widthMm: 1875, heightMm: 1655, weightKg: 1720, minTurningRadiusM: 5.7 }),

  // ============================================================
  // ボルボ V60 2代目 (2018-)
  // ============================================================
  { ...v60Base, trimName: "Plus B4", driveType: "2WD", transmission: "8AT", lengthMm: 4780, widthMm: 1850, heightMm: 1435, weightKg: 1690, minTurningRadiusM: 5.7 },
  t(v60Base, { trimName: "T6 PHV AWD", driveType: "AWD", transmission: "8AT", lengthMm: 4780, widthMm: 1850, heightMm: 1430, weightKg: 2050, minTurningRadiusM: 5.7 }),

  // ============================================================
  // ボルボ V60 クロスカントリー (2019-)
  // ============================================================
  { ...v60ccBase, trimName: "ウルトラ B5 AWD", driveType: "AWD", transmission: "8AT", lengthMm: 4785, widthMm: 1895, heightMm: 1505, weightKg: 1830, minTurningRadiusM: 5.7 },

  // ============================================================
  // プジョー 208 2代目 (2020-)
  // ============================================================
  { ...peugeot208Base, trimName: "アリュール", driveType: "2WD", transmission: "8AT", lengthMm: 4095, widthMm: 1745, heightMm: 1445, weightKg: 1170, minTurningRadiusM: 5.4 },
  t(peugeot208Base, { trimName: "e-208 GT", driveType: "2WD", transmission: "1速固定", lengthMm: 4095, widthMm: 1745, heightMm: 1465, weightKg: 1530, minTurningRadiusM: 5.4 }),

  // ============================================================
  // プジョー 2008 2代目 (2020-)
  // ============================================================
  { ...peugeot2008Base, trimName: "GT", driveType: "2WD", transmission: "8AT", lengthMm: 4305, widthMm: 1770, heightMm: 1550, weightKg: 1320, minTurningRadiusM: 5.4 },
  t(peugeot2008Base, { trimName: "e-2008 GT", driveType: "2WD", transmission: "1速固定", lengthMm: 4305, widthMm: 1770, heightMm: 1580, weightKg: 1610, minTurningRadiusM: 5.4 }),

  // ============================================================
  // プジョー 308 P5 (2022-)
  // ============================================================
  { ...peugeot308Base, trimName: "GT", driveType: "2WD", transmission: "8AT", lengthMm: 4420, widthMm: 1850, heightMm: 1475, weightKg: 1350, minTurningRadiusM: 5.4 },
  t(peugeot308Base, { trimName: "GT PHEV", driveType: "2WD", transmission: "8AT", lengthMm: 4420, widthMm: 1850, heightMm: 1475, weightKg: 1660, minTurningRadiusM: 5.4 }),

  // ============================================================
  // プジョー 3008 新型 (2025-)
  // ============================================================
  { ...peugeot3008Base, trimName: "GT", driveType: "2WD", transmission: "7DCT", lengthMm: 4565, widthMm: 1895, heightMm: 1665, weightKg: 1620, minTurningRadiusM: 5.5 },

  // ============================================================
  // シトロエン C3 新型 (2025-)
  // ============================================================
  { ...c3Base, trimName: "ハイブリッド", driveType: "2WD", transmission: "6DCT", lengthMm: 4015, widthMm: 1755, heightMm: 1590, weightKg: 1270, minTurningRadiusM: 5.4 },

  // ============================================================
  // ルノー ルーテシア 5代目 (2020-)
  // ============================================================
  { ...luteciaBase, trimName: "インテンス テックパック", driveType: "2WD", transmission: "7DCT", lengthMm: 4075, widthMm: 1725, heightMm: 1470, weightKg: 1300, minTurningRadiusM: 5.2 },

  // ============================================================
  // ルノー キャプチャー 2代目 (2021-)
  // ============================================================
  { ...capturBase, trimName: "E-TECH ハイブリッド", driveType: "2WD", transmission: "DCT", lengthMm: 4240, widthMm: 1795, heightMm: 1590, weightKg: 1420, minTurningRadiusM: 5.4 },

  // ============================================================
  // ルノー アルカナ (2022-)
  // ============================================================
  { ...arkanaBase, trimName: "E-TECH ハイブリッド", driveType: "2WD", transmission: "DCT", lengthMm: 4570, widthMm: 1820, heightMm: 1580, weightKg: 1470, minTurningRadiusM: 5.5 },

  // ============================================================
  // アルファロメオ トナーレ (2023-)
  // ============================================================
  { ...tonaleBase, trimName: "Ti ハイブリッド", driveType: "2WD", transmission: "7DCT", lengthMm: 4530, widthMm: 1835, heightMm: 1600, weightKg: 1630, minTurningRadiusM: 5.7 },

  // ============================================================
  // ヒョンデ コナ EV (2023-)
  // ============================================================
  { ...konaBase, trimName: "Lounge EV", driveType: "2WD", transmission: "1速固定", lengthMm: 4355, widthMm: 1825, heightMm: 1590, weightKg: 1770, minTurningRadiusM: 5.4 },

  // ============================================================
  // MINI 3ドア F66 (2024-)
  // ============================================================
  { ...mini3doorBase, trimName: "クーパーC", driveType: "2WD", transmission: "7DCT", lengthMm: 3875, widthMm: 1745, heightMm: 1455, weightKg: 1280, minTurningRadiusM: 5.2 },
  t(mini3doorBase, { trimName: "クーパーS", driveType: "2WD", transmission: "7DCT", lengthMm: 3875, widthMm: 1745, heightMm: 1455, weightKg: 1320, minTurningRadiusM: 5.2 }),

  // ============================================================
  // MINI 5ドア F65 (2024-)
  // ============================================================
  { ...mini5doorBase, trimName: "クーパーC", driveType: "2WD", transmission: "7DCT", lengthMm: 4035, widthMm: 1745, heightMm: 1470, weightKg: 1340, minTurningRadiusM: 5.2 },
  t(mini5doorBase, { trimName: "クーパーS", driveType: "2WD", transmission: "7DCT", lengthMm: 4035, widthMm: 1745, heightMm: 1470, weightKg: 1380, minTurningRadiusM: 5.2 }),

  // ============================================================
  // MINI カントリーマン U25 (2024-)
  // ============================================================
  { ...miniCountrymanBase, trimName: "カントリーマンC", driveType: "2WD", transmission: "7DCT", lengthMm: 4445, widthMm: 1845, heightMm: 1660, weightKg: 1520, minTurningRadiusM: 5.5 },
  t(miniCountrymanBase, { trimName: "カントリーマンS ALL4", driveType: "AWD", transmission: "7DCT", lengthMm: 4445, widthMm: 1845, heightMm: 1660, weightKg: 1640, minTurningRadiusM: 5.5 }),
];

// ============================================================
// 駐車場データ定義
// ============================================================
interface ParkingLotSeed {
  name: string;
  slug: string;
  address: string;
  latitude: number;
  longitude: number;
  parkingType: "mechanical" | "self_propelled" | "flat" | "tower";
  totalSpaces: number;
  facilityType?: "coin_parking" | "department_store" | "commercial_facility" | "office_building" | "stadium" | "hospital" | "station" | "residential" | "tower_parking" | "public_facility" | "hotel" | "airport" | "other";
  restrictions: {
    name: string;
    maxLengthMm: number;
    maxWidthMm: number;
    maxHeightMm: number;
    maxWeightKg: number;
    spacesCount: number;
    notes?: string;
  }[];
  fees: {
    feeType: "hourly" | "daily" | "monthly";
    amountYen: number;
    durationMinutes?: number;
    notes?: string;
  }[];
  is24h: boolean;
  openTime?: string;
  closeTime?: string;
}

const parkingData: ParkingLotSeed[] = [
  // ============================================================
  // 港区
  // ============================================================
  {
    name: "汐留タワーパーキング",
    slug: "shiodome-tower-parking",
    address: "東京都港区東新橋1-6-2",
    latitude: 35.6625, longitude: 139.7615,
    parkingType: "tower", totalSpaces: 30,
    restrictions: [
      { name: "普通車", maxLengthMm: 5300, maxWidthMm: 1950, maxHeightMm: 1550, maxWeightKg: 2300, spacesCount: 15 },
      { name: "ハイルーフ", maxLengthMm: 5300, maxWidthMm: 1950, maxHeightMm: 2100, maxWeightKg: 2300, spacesCount: 15 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 200, durationMinutes: 15, notes: "8-24時" },
    ],
    is24h: true,
  },
  {
    name: "赤坂パーキングセンター",
    slug: "akasaka-parking-center",
    address: "東京都港区赤坂6-5-1",
    latitude: 35.6720, longitude: 139.7340,
    parkingType: "self_propelled", totalSpaces: 128,
    restrictions: [
      { name: "一般", maxLengthMm: 6000, maxWidthMm: 2100, maxHeightMm: 2100, maxWeightKg: 3000, spacesCount: 128 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 300, durationMinutes: 20, notes: "7-20時" },
    ],
    is24h: true,
  },
  // ============================================================
  // 中央区
  // ============================================================
  {
    name: "ノイパーキング銀座7丁目",
    slug: "noi-parking-ginza-7chome",
    address: "東京都中央区銀座7-12-9",
    latitude: 35.6680, longitude: 139.7610,
    parkingType: "mechanical", totalSpaces: 31,
    restrictions: [
      { name: "標準", maxLengthMm: 5300, maxWidthMm: 1950, maxHeightMm: 2000, maxWeightKg: 2500, spacesCount: 31 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 30 },
    ],
    is24h: false, openTime: "07:00", closeTime: "22:00",
  },
  {
    name: "銀座四丁目タワー駐車場",
    slug: "ginza-4chome-tower-parking",
    address: "東京都中央区銀座4-9-13",
    latitude: 35.6695, longitude: 139.7670,
    parkingType: "tower", totalSpaces: 50,
    restrictions: [
      { name: "標準", maxLengthMm: 5300, maxWidthMm: 1950, maxHeightMm: 1550, maxWeightKg: 2300, spacesCount: 50 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 330, durationMinutes: 30 },
    ],
    is24h: false, openTime: "07:30", closeTime: "22:00",
  },
  {
    name: "NPC24H GINZA KABUKIZAパーキング",
    slug: "npc24h-ginza-kabukiza-parking",
    address: "東京都中央区銀座4-12-15",
    latitude: 35.6693, longitude: 139.7685,
    parkingType: "mechanical", totalSpaces: 80,
    restrictions: [
      { name: "普通車", maxLengthMm: 5300, maxWidthMm: 2050, maxHeightMm: 1550, maxWeightKg: 2300, spacesCount: 40 },
      { name: "ハイルーフ", maxLengthMm: 5300, maxWidthMm: 2050, maxHeightMm: 2050, maxWeightKg: 2500, spacesCount: 40 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 330, durationMinutes: 30 },
    ],
    is24h: true,
  },
  {
    name: "日本橋室町三井タワー駐車場",
    slug: "nihonbashi-muromachi-mitsui-tower-parking",
    address: "東京都中央区日本橋室町3-2-1",
    latitude: 35.6870, longitude: 139.7740,
    parkingType: "mechanical", totalSpaces: 260,
    restrictions: [
      { name: "普通車", maxLengthMm: 5300, maxWidthMm: 1900, maxHeightMm: 1550, maxWeightKg: 2500, spacesCount: 130 },
      { name: "ハイルーフ", maxLengthMm: 5300, maxWidthMm: 1900, maxHeightMm: 2000, maxWeightKg: 2500, spacesCount: 130 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 250, durationMinutes: 30 },
    ],
    is24h: false, openTime: "06:00", closeTime: "26:00",
  },
  // ============================================================
  // 千代田区
  // ============================================================
  {
    name: "東京ミッドタウン日比谷駐車場",
    slug: "tokyo-midtown-hibiya-parking",
    address: "東京都千代田区有楽町1-1-3",
    latitude: 35.6740, longitude: 139.7590,
    parkingType: "mechanical", totalSpaces: 290,
    restrictions: [
      { name: "機械式", maxLengthMm: 5300, maxWidthMm: 1900, maxHeightMm: 2050, maxWeightKg: 2300, spacesCount: 290 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 300, durationMinutes: 30 },
    ],
    is24h: false, openTime: "06:00", closeTime: "26:00",
  },
  {
    name: "丸の内中央パーキング",
    slug: "marunouchi-chuo-parking",
    address: "東京都千代田区丸の内2丁目",
    latitude: 35.6815, longitude: 139.7640,
    parkingType: "self_propelled", totalSpaces: 997,
    restrictions: [
      { name: "一般", maxLengthMm: 6000, maxWidthMm: 2200, maxHeightMm: 2100, maxWeightKg: 3000, spacesCount: 997 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 30 },
    ],
    is24h: false, openTime: "06:00", closeTime: "24:00",
  },
  // ============================================================
  // 新宿区
  // ============================================================
  {
    name: "新宿エルタワー駐車場",
    slug: "shinjuku-l-tower-parking",
    address: "東京都新宿区西新宿1-6-1",
    latitude: 35.6922, longitude: 139.6974,
    parkingType: "mechanical", totalSpaces: 131,
    restrictions: [
      { name: "機械式", maxLengthMm: 4700, maxWidthMm: 1700, maxHeightMm: 1500, maxWeightKg: 1500, spacesCount: 100, notes: "機械式パレット" },
      { name: "自走式", maxLengthMm: 6000, maxWidthMm: 2000, maxHeightMm: 2100, maxWeightKg: 4000, spacesCount: 31, notes: "自走式スペース" },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 30 },
    ],
    is24h: false, openTime: "07:00", closeTime: "23:30",
  },
  {
    name: "京王新宿追分ビル駐車場",
    slug: "keio-shinjuku-oiwake-building-parking",
    address: "東京都新宿区新宿3-1-13",
    latitude: 35.6903, longitude: 139.7037,
    parkingType: "mechanical", totalSpaces: 30,
    restrictions: [
      { name: "標準", maxLengthMm: 5300, maxWidthMm: 1900, maxHeightMm: 1550, maxWeightKg: 2300, spacesCount: 30 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 300, durationMinutes: 30 },
    ],
    is24h: false, openTime: "08:00", closeTime: "22:00",
  },
  {
    name: "公共新宿パーキング",
    slug: "kokyo-shinjuku-parking",
    address: "東京都新宿区歌舞伎町2-3-2",
    latitude: 35.6961, longitude: 139.7034,
    parkingType: "mechanical", totalSpaces: 100,
    restrictions: [
      { name: "標準", maxLengthMm: 5300, maxWidthMm: 1900, maxHeightMm: 1550, maxWeightKg: 2000, spacesCount: 100 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 300, durationMinutes: 30 },
    ],
    is24h: true,
  },
  // ============================================================
  // 渋谷区
  // ============================================================
  {
    name: "タイムズ道玄坂通",
    slug: "times-dogenzaka-dori",
    address: "東京都渋谷区道玄坂2-25",
    latitude: 35.6575, longitude: 139.6968,
    parkingType: "mechanical", totalSpaces: 128,
    restrictions: [
      { name: "ロールーフ", maxLengthMm: 5300, maxWidthMm: 2000, maxHeightMm: 1550, maxWeightKg: 2500, spacesCount: 64 },
      { name: "ハイルーフ", maxLengthMm: 5300, maxWidthMm: 2000, maxHeightMm: 2050, maxWeightKg: 2500, spacesCount: 64 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 300, durationMinutes: 20 },
    ],
    is24h: true,
  },
  {
    name: "トラストパーク渋東シネタワー",
    slug: "trustpark-shibuton-cinetower",
    address: "東京都渋谷区道玄坂2-6-17",
    latitude: 35.6580, longitude: 139.6957,
    parkingType: "mechanical", totalSpaces: 35,
    restrictions: [
      { name: "標準", maxLengthMm: 5600, maxWidthMm: 1850, maxHeightMm: 1550, maxWeightKg: 2200, spacesCount: 35 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 300, durationMinutes: 20 },
    ],
    is24h: true,
  },
  {
    name: "渋谷1丁目駐車場",
    slug: "shibuya-1chome-parking",
    address: "東京都渋谷区渋谷1-26-5",
    latitude: 35.6593, longitude: 139.7035,
    parkingType: "mechanical", totalSpaces: 375,
    restrictions: [
      { name: "北棟", maxLengthMm: 5300, maxWidthMm: 2050, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 188 },
      { name: "南棟", maxLengthMm: 5300, maxWidthMm: 1950, maxHeightMm: 2100, maxWeightKg: 2300, spacesCount: 187 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 350, durationMinutes: 30 },
    ],
    is24h: true,
  },
  // ============================================================
  // 目黒区
  // ============================================================
  {
    name: "中目黒GT駐車場",
    slug: "nakameguro-gt-parking",
    address: "東京都目黒区上目黒2-1-1",
    latitude: 35.6441, longitude: 139.6987,
    parkingType: "tower", totalSpaces: 42,
    restrictions: [
      { name: "標準", maxLengthMm: 5000, maxWidthMm: 1850, maxHeightMm: 1550, maxWeightKg: 1700, spacesCount: 42 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 500, durationMinutes: 30 },
    ],
    is24h: false, openTime: "07:00", closeTime: "24:00",
  },
  {
    name: "ノアビル23立体駐車場",
    slug: "noah-building-23-parking",
    address: "東京都目黒区平町1-26-2",
    latitude: 35.6183, longitude: 139.6848,
    parkingType: "mechanical", totalSpaces: 51,
    restrictions: [
      { name: "1号機", maxLengthMm: 5200, maxWidthMm: 1950, maxHeightMm: 1550, maxWeightKg: 1800, spacesCount: 26 },
      { name: "2号機", maxLengthMm: 5250, maxWidthMm: 2050, maxHeightMm: 1750, maxWeightKg: 2300, spacesCount: 25 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 200, durationMinutes: 20 },
    ],
    is24h: false, openTime: "07:00", closeTime: "24:00",
  },
  // ============================================================
  // 品川区
  // ============================================================
  {
    name: "タイムズ大崎センタービル",
    slug: "times-osaki-center-building",
    address: "東京都品川区大崎1-5",
    latitude: 35.6197, longitude: 139.7285,
    parkingType: "mechanical", totalSpaces: 68,
    restrictions: [
      { name: "標準", maxLengthMm: 5000, maxWidthMm: 1900, maxHeightMm: 1550, maxWeightKg: 2300, spacesCount: 68 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 330, durationMinutes: 30 },
    ],
    is24h: false, openTime: "07:00", closeTime: "23:00",
  },
  {
    name: "コインパーク大森ベルポート",
    slug: "coinpark-omori-bellport",
    address: "東京都品川区南大井6-26-2",
    latitude: 35.5882, longitude: 139.7358,
    parkingType: "mechanical", totalSpaces: 93,
    restrictions: [
      { name: "標準", maxLengthMm: 5300, maxWidthMm: 1950, maxHeightMm: 1550, maxWeightKg: 2300, spacesCount: 93 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 500, durationMinutes: 30 },
    ],
    is24h: false, openTime: "07:00", closeTime: "23:30",
  },
  // ============================================================
  // 世田谷区
  // ============================================================
  {
    name: "二子玉川ライズP1駐車場",
    slug: "futakotamagawa-rise-p1-parking",
    address: "東京都世田谷区玉川1-14-1",
    latitude: 35.6115, longitude: 139.6265,
    parkingType: "mechanical", totalSpaces: 602,
    restrictions: [
      { name: "普通車", maxLengthMm: 5300, maxWidthMm: 1900, maxHeightMm: 1550, maxWeightKg: 2300, spacesCount: 301 },
      { name: "ハイルーフ", maxLengthMm: 5300, maxWidthMm: 1900, maxHeightMm: 2000, maxWeightKg: 2300, spacesCount: 301 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 300, durationMinutes: 30 },
    ],
    is24h: false, openTime: "10:00", closeTime: "25:30",
  },
  {
    name: "キャロットパーク三軒茶屋",
    slug: "carrot-park-sangenjaya",
    address: "東京都世田谷区太子堂4-1-1",
    latitude: 35.6436, longitude: 139.6703,
    parkingType: "mechanical", totalSpaces: 92,
    restrictions: [
      { name: "機械式", maxLengthMm: 6000, maxWidthMm: 2300, maxHeightMm: 1550, maxWeightKg: 4000, spacesCount: 46 },
      { name: "自走式", maxLengthMm: 6000, maxWidthMm: 2300, maxHeightMm: 2500, maxWeightKg: 4000, spacesCount: 46 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 30 },
    ],
    is24h: false, openTime: "07:00", closeTime: "25:00",
  },
  {
    name: "西友三軒茶屋店駐車場",
    slug: "seiyu-sangenjaya-parking",
    address: "東京都世田谷区太子堂4-24-8",
    latitude: 35.6439, longitude: 139.6710,
    parkingType: "mechanical", totalSpaces: 22,
    restrictions: [
      { name: "標準", maxLengthMm: 4900, maxWidthMm: 1720, maxHeightMm: 1500, maxWeightKg: 2000, spacesCount: 22, notes: "制限が厳しいため要注意" },
    ],
    fees: [
      { feeType: "hourly", amountYen: 210, durationMinutes: 30 },
    ],
    is24h: false, openTime: "08:00", closeTime: "23:00",
  },
  // ============================================================
  // 大田区
  // ============================================================
  {
    name: "グランデュオ蒲田東館駐車場",
    slug: "granduo-kamata-higashikan-parking",
    address: "東京都大田区蒲田5-12",
    latitude: 35.5625, longitude: 139.7165,
    parkingType: "mechanical", totalSpaces: 30,
    restrictions: [
      { name: "標準", maxLengthMm: 5750, maxWidthMm: 2050, maxHeightMm: 1600, maxWeightKg: 2200, spacesCount: 30 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 300, durationMinutes: 30 },
    ],
    is24h: false, openTime: "10:00", closeTime: "22:00",
  },
  {
    name: "京急蒲田駅前機械式駐車場",
    slug: "keikyu-kamata-ekimae-parking",
    address: "東京都大田区蒲田4-10-14",
    latitude: 35.5610, longitude: 139.7195,
    parkingType: "mechanical", totalSpaces: 36,
    restrictions: [
      { name: "標準", maxLengthMm: 5300, maxWidthMm: 1900, maxHeightMm: 1550, maxWeightKg: 2500, spacesCount: 18 },
      { name: "ハイルーフ", maxLengthMm: 5300, maxWidthMm: 1900, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 18 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 300, durationMinutes: 30 },
    ],
    is24h: false, openTime: "06:30", closeTime: "25:30",
  },
  // ============================================================
  // 文京区
  // ============================================================
  {
    name: "文京シビックセンター駐車場",
    slug: "bunkyo-civic-center-parking",
    address: "東京都文京区春日1-16-21",
    latitude: 35.7079, longitude: 139.7521,
    parkingType: "mechanical", totalSpaces: 130,
    restrictions: [
      { name: "標準", maxLengthMm: 5700, maxWidthMm: 2000, maxHeightMm: 1550, maxWeightKg: 2200, spacesCount: 130 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 250, durationMinutes: 30 },
    ],
    is24h: false, openTime: "08:15", closeTime: "22:00",
  },
  {
    name: "NPC24H後楽1丁目パーキング",
    slug: "npc24h-koraku-1chome-parking",
    address: "東京都文京区後楽1-2-8",
    latitude: 35.7058, longitude: 139.7517,
    parkingType: "mechanical", totalSpaces: 36,
    restrictions: [
      { name: "標準", maxLengthMm: 5000, maxWidthMm: 1900, maxHeightMm: 2300, maxWeightKg: 2500, spacesCount: 36 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 30 },
    ],
    is24h: true,
  },
  // ============================================================
  // 台東区
  // ============================================================
  {
    name: "上野中央通り地下駐車場",
    slug: "ueno-chuo-dori-underground-parking",
    address: "東京都台東区上野2-13先",
    latitude: 35.7096, longitude: 139.7726,
    parkingType: "mechanical", totalSpaces: 300,
    restrictions: [
      { name: "標準", maxLengthMm: 5300, maxWidthMm: 1900, maxHeightMm: 2000, maxWeightKg: 2300, spacesCount: 300 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 300, durationMinutes: 30, notes: "初回30分300円、以降30分100円" },
    ],
    is24h: true,
  },
  {
    name: "上野パーキングセンター",
    slug: "ueno-parking-center",
    address: "東京都台東区上野公園1-50",
    latitude: 35.7132, longitude: 139.7745,
    parkingType: "self_propelled", totalSpaces: 400,
    restrictions: [
      { name: "一般", maxLengthMm: 6000, maxWidthMm: 2500, maxHeightMm: 2000, maxWeightKg: 2000, spacesCount: 400 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 300, durationMinutes: 30 },
    ],
    is24h: true,
  },
  // ============================================================
  // 豊島区
  // ============================================================
  {
    name: "NPC24Hクイック池袋パーキング",
    slug: "npc24h-quick-ikebukuro-parking",
    address: "東京都豊島区池袋2-47-2",
    latitude: 35.7315, longitude: 139.7090,
    parkingType: "mechanical", totalSpaces: 38,
    restrictions: [
      { name: "普通車", maxLengthMm: 5300, maxWidthMm: 1900, maxHeightMm: 1550, maxWeightKg: 2300, spacesCount: 19 },
      { name: "ハイルーフ", maxLengthMm: 5050, maxWidthMm: 1900, maxHeightMm: 2050, maxWeightKg: 2300, spacesCount: 19 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 220, durationMinutes: 20 },
    ],
    is24h: true,
  },
  // ============================================================
  // 江東区
  // ============================================================
  {
    name: "タイムズ有明フロンティア",
    slug: "times-ariake-frontier",
    address: "東京都江東区有明3-7",
    latitude: 35.6325, longitude: 139.7920,
    parkingType: "mechanical", totalSpaces: 141,
    restrictions: [
      { name: "標準", maxLengthMm: 5000, maxWidthMm: 1900, maxHeightMm: 1500, maxWeightKg: 1700, spacesCount: 141, notes: "制限が厳しいため要注意" },
    ],
    fees: [
      { feeType: "hourly", amountYen: 440, durationMinutes: 30 },
    ],
    is24h: false, openTime: "07:00", closeTime: "22:00",
  },
  // ============================================================
  // 墨田区
  // ============================================================
  {
    name: "墨田区庁舎駐車場",
    slug: "sumida-city-hall-parking",
    address: "東京都墨田区吾妻橋1-23-20",
    latitude: 35.7102, longitude: 139.8020,
    parkingType: "mechanical", totalSpaces: 60,
    restrictions: [
      { name: "標準", maxLengthMm: 5050, maxWidthMm: 1950, maxHeightMm: 1550, maxWeightKg: 1600, spacesCount: 60 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 250, durationMinutes: 30 },
    ],
    is24h: false, openTime: "07:00", closeTime: "22:00",
  },
  // ============================================================
  // 足立区
  // ============================================================
  {
    name: "北千住駅前駐車場",
    slug: "kitasenju-ekimae-parking",
    address: "東京都足立区千住3-92",
    latitude: 35.7496, longitude: 139.8046,
    parkingType: "mechanical", totalSpaces: 336,
    restrictions: [
      { name: "ロールーフ", maxLengthMm: 5300, maxWidthMm: 1900, maxHeightMm: 1550, maxWeightKg: 2300, spacesCount: 168 },
      { name: "ハイルーフ", maxLengthMm: 5300, maxWidthMm: 1900, maxHeightMm: 2000, maxWeightKg: 2300, spacesCount: 168 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 300, durationMinutes: 30 },
    ],
    is24h: false, openTime: "08:00", closeTime: "23:00",
  },
  // ============================================================
  // 北区
  // ============================================================
  {
    name: "タイムズ赤羽駅前第2",
    slug: "times-akabane-ekimae-2",
    address: "東京都北区赤羽西1-4",
    latitude: 35.7775, longitude: 139.7200,
    parkingType: "mechanical", totalSpaces: 24,
    restrictions: [
      { name: "標準", maxLengthMm: 5300, maxWidthMm: 2050, maxHeightMm: 1550, maxWeightKg: 2300, spacesCount: 12 },
      { name: "ハイルーフ", maxLengthMm: 5300, maxWidthMm: 2050, maxHeightMm: 2000, maxWeightKg: 2300, spacesCount: 12 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 200, durationMinutes: 30 },
    ],
    is24h: true,
  },
  // ============================================================
  // 荒川区
  // ============================================================
  {
    name: "日暮里駅前ステーションガーデンタワー駐車場",
    slug: "nippori-station-garden-tower-parking",
    address: "東京都荒川区西日暮里2-25-1",
    latitude: 35.7282, longitude: 139.7711,
    parkingType: "mechanical", totalSpaces: 59,
    restrictions: [
      { name: "標準", maxLengthMm: 5000, maxWidthMm: 1980, maxHeightMm: 1550, maxWeightKg: 2200, spacesCount: 30 },
      { name: "ハイルーフ", maxLengthMm: 5300, maxWidthMm: 2050, maxHeightMm: 2000, maxWeightKg: 2300, spacesCount: 29 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 300, durationMinutes: 30 },
    ],
    is24h: false, openTime: "08:00", closeTime: "23:00",
  },
  // ============================================================
  // 練馬区
  // ============================================================
  {
    name: "大泉学園ゆめりあ北パーキング",
    slug: "oizumi-gakuen-yumeria-kita-parking",
    address: "東京都練馬区東大泉1丁目",
    latitude: 35.7525, longitude: 139.5870,
    parkingType: "mechanical", totalSpaces: 38,
    restrictions: [
      { name: "標準", maxLengthMm: 5300, maxWidthMm: 2050, maxHeightMm: 1550, maxWeightKg: 2300, spacesCount: 38 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 100, durationMinutes: 15 },
    ],
    is24h: false, openTime: "07:00", closeTime: "23:00",
  },
  // ============================================================
  // 中野区
  // ============================================================
  {
    name: "タイムズ丸井中野店",
    slug: "times-marui-nakano",
    address: "東京都中野区中野3-34",
    latitude: 35.7047, longitude: 139.6651,
    parkingType: "mechanical", totalSpaces: 57,
    restrictions: [
      { name: "標準", maxLengthMm: 5300, maxWidthMm: 2000, maxHeightMm: 1500, maxWeightKg: 2300, spacesCount: 57, notes: "高さ制限が厳しいため要注意" },
    ],
    fees: [
      { feeType: "hourly", amountYen: 250, durationMinutes: 30 },
    ],
    is24h: false, openTime: "08:30", closeTime: "23:00",
  },
  // ============================================================
  // 杉並区
  // ============================================================
  {
    name: "NPC24H高円寺北パーキング",
    slug: "npc24h-koenji-kita-parking",
    address: "東京都杉並区高円寺北2-30-9",
    latitude: 35.7100, longitude: 139.6498,
    parkingType: "mechanical", totalSpaces: 12,
    restrictions: [
      { name: "標準", maxLengthMm: 5050, maxWidthMm: 1850, maxHeightMm: 1550, maxWeightKg: 2000, spacesCount: 12 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 220, durationMinutes: 20 },
    ],
    is24h: true,
  },
  // ============================================================
  // 葛飾区
  // ============================================================
  {
    name: "葛飾区金町南駐車場",
    slug: "katsushika-kanamachi-minami-parking",
    address: "東京都葛飾区金町6-2",
    latitude: 35.7687, longitude: 139.8713,
    parkingType: "self_propelled", totalSpaces: 100,
    restrictions: [
      { name: "一般", maxLengthMm: 5000, maxWidthMm: 1900, maxHeightMm: 2100, maxWeightKg: 2000, spacesCount: 100 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 60, notes: "初回60分400円、以降30分200円" },
    ],
    is24h: true,
  },
  // ============================================================
  // 江戸川区
  // ============================================================
  {
    name: "江戸川区新川地下駐車場",
    slug: "edogawa-shinkawa-underground-parking",
    address: "東京都江戸川区船堀6-11先",
    latitude: 35.6862, longitude: 139.8610,
    parkingType: "self_propelled", totalSpaces: 200,
    restrictions: [
      { name: "一般", maxLengthMm: 5600, maxWidthMm: 2000, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 200 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 200, durationMinutes: 60, notes: "初回60分200円、以降30分100円" },
    ],
    is24h: false, openTime: "07:00", closeTime: "25:00",
  },
  // ============================================================
  // 追加分: 百貨店・商業施設 + 各区追加 (39-100件目)
  // ============================================================

  // --- 中央区: 百貨店・商業施設 ---
  {
    name: "日本橋三越本店駐車場",
    slug: "nihombashi-mitsukoshi-parking",
    address: "東京都中央区日本橋室町1-3",
    latitude: 35.6858, longitude: 139.7731,
    parkingType: "mechanical", totalSpaces: 260,
    restrictions: [
      { name: "機械式", maxLengthMm: 5300, maxWidthMm: 1950, maxHeightMm: 1660, maxWeightKg: 2500, spacesCount: 200 },
      { name: "自走式", maxLengthMm: 5300, maxWidthMm: 2000, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 60 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 500, durationMinutes: 60 },
    ],
    is24h: false, openTime: "09:30", closeTime: "22:15",
  },
  {
    name: "銀座三越駐車場",
    slug: "ginza-mitsukoshi-parking",
    address: "東京都中央区銀座4-6-16",
    latitude: 35.6719, longitude: 139.7671,
    parkingType: "self_propelled", totalSpaces: 399,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5300, maxWidthMm: 1900, maxHeightMm: 2000, maxWeightKg: 2300, spacesCount: 399 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: false, openTime: "08:00", closeTime: "23:30",
  },
  {
    name: "西銀座駐車場",
    slug: "nishi-ginza-parking",
    address: "東京都中央区銀座2丁目地先",
    latitude: 35.6724, longitude: 139.7649,
    parkingType: "self_propelled", totalSpaces: 800,
    restrictions: [
      { name: "全車共通", maxLengthMm: 6000, maxWidthMm: 2100, maxHeightMm: 2000, maxWeightKg: 3000, spacesCount: 800 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: true,
  },
  {
    name: "松屋銀座駐車場",
    slug: "matsuya-ginza-parking",
    address: "東京都中央区銀座3-6-1",
    latitude: 35.6722, longitude: 139.7667,
    parkingType: "mechanical", totalSpaces: 93,
    restrictions: [
      { name: "普通車", maxLengthMm: 5300, maxWidthMm: 1920, maxHeightMm: 1550, maxWeightKg: 2300, spacesCount: 93 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: false, openTime: "09:45", closeTime: "22:10",
  },
  {
    name: "GINZA SIX駐車場",
    slug: "ginza-six-parking",
    address: "東京都中央区銀座6-10-1",
    latitude: 35.6697, longitude: 139.7633,
    parkingType: "mechanical", totalSpaces: 445,
    restrictions: [
      { name: "機械式", maxLengthMm: 5300, maxWidthMm: 2000, maxHeightMm: 2000, maxWeightKg: 2500, spacesCount: 423 },
      { name: "自走式", maxLengthMm: 6000, maxWidthMm: 2200, maxHeightMm: 2000, maxWeightKg: 2500, spacesCount: 22 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: false, openTime: "06:00", closeTime: "02:00",
  },
  {
    name: "東急プラザ銀座駐車場",
    slug: "tokyu-plaza-ginza-parking",
    address: "東京都中央区銀座5-2-1",
    latitude: 35.6722, longitude: 139.7624,
    parkingType: "mechanical", totalSpaces: 174,
    restrictions: [
      { name: "普通車", maxLengthMm: 5300, maxWidthMm: 1950, maxHeightMm: 1550, maxWeightKg: 2600, spacesCount: 100 },
      { name: "ハイルーフ", maxLengthMm: 5300, maxWidthMm: 1950, maxHeightMm: 2000, maxWeightKg: 2600, spacesCount: 74 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 660, durationMinutes: 60 },
    ],
    is24h: true,
  },
  {
    name: "日本橋高島屋タワーパーキング",
    slug: "nihombashi-takashimaya-tower-parking",
    address: "東京都中央区日本橋2-4-1",
    latitude: 35.6812, longitude: 139.7739,
    parkingType: "tower", totalSpaces: 178,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5600, maxWidthMm: 2050, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 178 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 60 },
    ],
    is24h: false, openTime: "10:30", closeTime: "21:30",
  },
  {
    name: "コレド室町1駐車場",
    slug: "coredo-muromachi-1-parking",
    address: "東京都中央区日本橋室町2-2-1",
    latitude: 35.6870, longitude: 139.7736,
    parkingType: "mechanical", totalSpaces: 290,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5300, maxWidthMm: 1950, maxHeightMm: 2000, maxWeightKg: 2300, spacesCount: 290 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 500, durationMinutes: 60 },
    ],
    is24h: false, openTime: "06:00", closeTime: "02:00",
  },

  // --- 港区: 追加 ---
  {
    name: "六本木ヒルズP2駐車場",
    slug: "roppongi-hills-p2-parking",
    address: "東京都港区六本木6-10-1",
    latitude: 35.6603, longitude: 139.7295,
    parkingType: "self_propelled", totalSpaces: 437,
    restrictions: [
      { name: "全車共通", maxLengthMm: 6000, maxWidthMm: 2500, maxHeightMm: 2200, maxWeightKg: 2300, spacesCount: 437 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: true,
  },
  {
    name: "表参道ヒルズ駐車場",
    slug: "omotesando-hills-parking",
    address: "東京都渋谷区神宮前4-12-10",
    latitude: 35.6662, longitude: 139.7100,
    parkingType: "self_propelled", totalSpaces: 182,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5000, maxWidthMm: 1900, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 182 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: false, openTime: "08:00", closeTime: "23:00",
  },
  {
    name: "東京ミッドタウン六本木駐車場",
    slug: "tokyo-midtown-roppongi-parking",
    address: "東京都港区赤坂9-7-1",
    latitude: 35.6655, longitude: 139.7310,
    parkingType: "self_propelled", totalSpaces: 390,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5400, maxWidthMm: 2100, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 390 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: false, openTime: "06:00", closeTime: "02:00",
  },

  // --- 新宿区: 百貨店・商業施設 ---
  {
    name: "伊勢丹新宿店駐車場",
    slug: "isetan-shinjuku-parking",
    address: "東京都新宿区新宿3-14-1",
    latitude: 35.6920, longitude: 139.7044,
    parkingType: "mechanical", totalSpaces: 120,
    restrictions: [
      { name: "普通車", maxLengthMm: 5300, maxWidthMm: 1900, maxHeightMm: 1550, maxWeightKg: 2300, spacesCount: 80 },
      { name: "ハイルーフ", maxLengthMm: 5300, maxWidthMm: 1900, maxHeightMm: 2000, maxWeightKg: 2300, spacesCount: 40 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: false, openTime: "10:00", closeTime: "21:00",
  },
  {
    name: "小田急百貨店新宿店駐車場",
    slug: "odakyu-shinjuku-parking",
    address: "東京都新宿区西新宿1-1-3",
    latitude: 35.6915, longitude: 139.6997,
    parkingType: "mechanical", totalSpaces: 180,
    restrictions: [
      { name: "普通車", maxLengthMm: 5200, maxWidthMm: 1900, maxHeightMm: 1550, maxWeightKg: 2300, spacesCount: 120 },
      { name: "ハイルーフ", maxLengthMm: 5200, maxWidthMm: 1900, maxHeightMm: 2000, maxWeightKg: 2300, spacesCount: 60 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: false, openTime: "07:00", closeTime: "24:00",
  },
  {
    name: "京王百貨店新宿店駐車場",
    slug: "keio-dept-shinjuku-parking",
    address: "東京都新宿区西新宿1-1-4",
    latitude: 35.6904, longitude: 139.6992,
    parkingType: "mechanical", totalSpaces: 100,
    restrictions: [
      { name: "普通車", maxLengthMm: 5000, maxWidthMm: 1850, maxHeightMm: 1550, maxWeightKg: 2000, spacesCount: 70 },
      { name: "ハイルーフ", maxLengthMm: 5000, maxWidthMm: 1850, maxHeightMm: 2050, maxWeightKg: 2000, spacesCount: 30 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: false, openTime: "10:00", closeTime: "21:30",
  },
  {
    name: "ルミネ新宿駐車場",
    slug: "lumine-shinjuku-parking",
    address: "東京都新宿区新宿3-38-2",
    latitude: 35.6894, longitude: 139.7006,
    parkingType: "mechanical", totalSpaces: 106,
    restrictions: [
      { name: "普通車", maxLengthMm: 5050, maxWidthMm: 1850, maxHeightMm: 1550, maxWeightKg: 2300, spacesCount: 106 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: false, openTime: "07:30", closeTime: "24:00",
  },
  {
    name: "新宿タカシマヤタイムズスクエア駐車場",
    slug: "takashimaya-times-square-parking",
    address: "東京都渋谷区千駄ヶ谷5-24-2",
    latitude: 35.6871, longitude: 139.7022,
    parkingType: "self_propelled", totalSpaces: 340,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5500, maxWidthMm: 2200, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 340 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: false, openTime: "07:30", closeTime: "24:30",
  },

  // --- 渋谷区: 追加 ---
  {
    name: "渋谷ヒカリエ駐車場",
    slug: "shibuya-hikarie-parking",
    address: "東京都渋谷区渋谷2-21-1",
    latitude: 35.6590, longitude: 139.7035,
    parkingType: "self_propelled", totalSpaces: 400,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5500, maxWidthMm: 2200, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 400 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: false, openTime: "06:30", closeTime: "24:00",
  },
  {
    name: "渋谷スクランブルスクエア駐車場",
    slug: "shibuya-scramble-square-parking",
    address: "東京都渋谷区渋谷2-24-12",
    latitude: 35.6586, longitude: 139.7021,
    parkingType: "self_propelled", totalSpaces: 280,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5500, maxWidthMm: 2200, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 280 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: false, openTime: "06:30", closeTime: "24:00",
  },
  {
    name: "渋谷マークシティ駐車場",
    slug: "shibuya-mark-city-parking",
    address: "東京都渋谷区道玄坂1-12-1",
    latitude: 35.6578, longitude: 139.6985,
    parkingType: "self_propelled", totalSpaces: 340,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5300, maxWidthMm: 1900, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 340 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: true,
  },
  {
    name: "渋谷パルコ駐車場",
    slug: "shibuya-parco-parking",
    address: "東京都渋谷区宇田川町15-1",
    latitude: 35.6612, longitude: 139.6983,
    parkingType: "mechanical", totalSpaces: 58,
    restrictions: [
      { name: "普通車", maxLengthMm: 5300, maxWidthMm: 1900, maxHeightMm: 1550, maxWeightKg: 2300, spacesCount: 36 },
      { name: "ハイルーフ", maxLengthMm: 5300, maxWidthMm: 1900, maxHeightMm: 2050, maxWeightKg: 2300, spacesCount: 22 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: false, openTime: "10:00", closeTime: "23:30",
  },

  // --- 豊島区: 百貨店・商業施設 ---
  {
    name: "西武池袋本店駐車場",
    slug: "seibu-ikebukuro-parking",
    address: "東京都豊島区南池袋1-28-1",
    latitude: 35.7290, longitude: 139.7100,
    parkingType: "mechanical", totalSpaces: 300,
    restrictions: [
      { name: "普通車", maxLengthMm: 5300, maxWidthMm: 1900, maxHeightMm: 1550, maxWeightKg: 2300, spacesCount: 200 },
      { name: "ハイルーフ", maxLengthMm: 5300, maxWidthMm: 1900, maxHeightMm: 2000, maxWeightKg: 2300, spacesCount: 100 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: false, openTime: "10:00", closeTime: "22:00",
  },
  {
    name: "東武百貨店池袋店駐車場",
    slug: "tobu-ikebukuro-parking",
    address: "東京都豊島区西池袋1-1-25",
    latitude: 35.7298, longitude: 139.7094,
    parkingType: "self_propelled", totalSpaces: 800,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5500, maxWidthMm: 2000, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 800 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: false, openTime: "10:00", closeTime: "22:30",
  },
  {
    name: "サンシャインシティ駐車場",
    slug: "sunshine-city-parking",
    address: "東京都豊島区東池袋3-1-1",
    latitude: 35.7292, longitude: 139.7185,
    parkingType: "self_propelled", totalSpaces: 1800,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5500, maxWidthMm: 2200, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 1800 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: true,
  },
  {
    name: "池袋パルコ駐車場",
    slug: "ikebukuro-parco-parking",
    address: "東京都豊島区南池袋1-28-2",
    latitude: 35.7284, longitude: 139.7110,
    parkingType: "mechanical", totalSpaces: 120,
    restrictions: [
      { name: "普通車", maxLengthMm: 5050, maxWidthMm: 1850, maxHeightMm: 1550, maxWeightKg: 2300, spacesCount: 80 },
      { name: "ハイルーフ", maxLengthMm: 5050, maxWidthMm: 1850, maxHeightMm: 2050, maxWeightKg: 2300, spacesCount: 40 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: false, openTime: "10:00", closeTime: "23:00",
  },

  // --- 台東区: 追加 ---
  {
    name: "松坂屋上野店駐車場",
    slug: "matsuzakaya-ueno-parking",
    address: "東京都台東区上野3-29-5",
    latitude: 35.7083, longitude: 139.7730,
    parkingType: "mechanical", totalSpaces: 200,
    restrictions: [
      { name: "普通車", maxLengthMm: 5050, maxWidthMm: 1850, maxHeightMm: 1550, maxWeightKg: 2300, spacesCount: 130 },
      { name: "ハイルーフ", maxLengthMm: 5050, maxWidthMm: 1850, maxHeightMm: 2050, maxWeightKg: 2300, spacesCount: 70 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 500, durationMinutes: 60 },
    ],
    is24h: false, openTime: "10:00", closeTime: "21:30",
  },
  {
    name: "松屋浅草駐車場",
    slug: "matsuya-asakusa-parking",
    address: "東京都台東区花川戸1-4-1",
    latitude: 35.7105, longitude: 139.7967,
    parkingType: "mechanical", totalSpaces: 100,
    restrictions: [
      { name: "普通車", maxLengthMm: 5050, maxWidthMm: 1900, maxHeightMm: 1550, maxWeightKg: 2000, spacesCount: 70 },
      { name: "ハイルーフ", maxLengthMm: 5050, maxWidthMm: 1900, maxHeightMm: 2050, maxWeightKg: 2000, spacesCount: 30 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 500, durationMinutes: 60 },
    ],
    is24h: false, openTime: "09:30", closeTime: "22:00",
  },
  {
    name: "浅草ROX駐車場",
    slug: "asakusa-rox-parking",
    address: "東京都台東区浅草1-25-15",
    latitude: 35.7118, longitude: 139.7950,
    parkingType: "self_propelled", totalSpaces: 120,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5500, maxWidthMm: 2100, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 120 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 60 },
    ],
    is24h: false, openTime: "09:30", closeTime: "23:00",
  },

  // --- 文京区: 追加 ---
  {
    name: "東京ドームシティ駐車場",
    slug: "tokyo-dome-city-parking",
    address: "東京都文京区後楽1-3-61",
    latitude: 35.7056, longitude: 139.7520,
    parkingType: "self_propelled", totalSpaces: 700,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5500, maxWidthMm: 2200, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 700 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 60 },
    ],
    is24h: true,
  },

  // --- 墨田区: 追加 ---
  {
    name: "東京ソラマチ駐車場",
    slug: "tokyo-solamachi-parking",
    address: "東京都墨田区押上1-1-2",
    latitude: 35.7101, longitude: 139.8107,
    parkingType: "self_propelled", totalSpaces: 460,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5500, maxWidthMm: 2200, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 460 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 350, durationMinutes: 30 },
    ],
    is24h: false, openTime: "07:30", closeTime: "23:00",
  },
  {
    name: "錦糸町丸井駐車場",
    slug: "kinshicho-marui-parking",
    address: "東京都墨田区江東橋3-9-10",
    latitude: 35.6961, longitude: 139.8141,
    parkingType: "mechanical", totalSpaces: 160,
    restrictions: [
      { name: "普通車", maxLengthMm: 5000, maxWidthMm: 1850, maxHeightMm: 1550, maxWeightKg: 2000, spacesCount: 100 },
      { name: "ハイルーフ", maxLengthMm: 5000, maxWidthMm: 1850, maxHeightMm: 2050, maxWeightKg: 2000, spacesCount: 60 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 60 },
    ],
    is24h: false, openTime: "10:00", closeTime: "21:30",
  },
  {
    name: "錦糸町アルカキット駐車場",
    slug: "kinshicho-arcakit-parking",
    address: "東京都墨田区錦糸1-2-1",
    latitude: 35.6975, longitude: 139.8130,
    parkingType: "self_propelled", totalSpaces: 250,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5500, maxWidthMm: 2000, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 250 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 300, durationMinutes: 30 },
    ],
    is24h: false, openTime: "08:00", closeTime: "24:00",
  },

  // --- 江東区: 追加 ---
  {
    name: "ららぽーと豊洲駐車場",
    slug: "lalaport-toyosu-parking",
    address: "東京都江東区豊洲2-4-9",
    latitude: 35.6555, longitude: 139.7928,
    parkingType: "self_propelled", totalSpaces: 2100,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5500, maxWidthMm: 2200, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 2100 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 300, durationMinutes: 60, notes: "最初の1時間無料" },
    ],
    is24h: false, openTime: "09:00", closeTime: "24:00",
  },
  {
    name: "アリオ北砂駐車場",
    slug: "ario-kitasuna-parking",
    address: "東京都江東区北砂2-17-1",
    latitude: 35.6876, longitude: 139.8320,
    parkingType: "self_propelled", totalSpaces: 900,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5500, maxWidthMm: 2200, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 900 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 300, durationMinutes: 60, notes: "最初の2時間無料" },
    ],
    is24h: false, openTime: "09:00", closeTime: "23:00",
  },
  {
    name: "南砂町ショッピングセンターSUNAMO駐車場",
    slug: "sunamo-parking",
    address: "東京都江東区新砂3-4-31",
    latitude: 35.6678, longitude: 139.8378,
    parkingType: "self_propelled", totalSpaces: 1400,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5500, maxWidthMm: 2200, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 1400 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 300, durationMinutes: 60, notes: "最初の1時間無料" },
    ],
    is24h: false, openTime: "09:00", closeTime: "24:00",
  },

  // --- 品川区: 追加 ---
  {
    name: "アトレ大井町駐車場",
    slug: "atre-oimachi-parking",
    address: "東京都品川区大井1-2-1",
    latitude: 35.6063, longitude: 139.7346,
    parkingType: "mechanical", totalSpaces: 67,
    restrictions: [
      { name: "普通車", maxLengthMm: 5000, maxWidthMm: 1850, maxHeightMm: 1550, maxWeightKg: 2000, spacesCount: 40 },
      { name: "ハイルーフ", maxLengthMm: 5000, maxWidthMm: 1850, maxHeightMm: 2050, maxWeightKg: 2000, spacesCount: 27 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 60 },
    ],
    is24h: false, openTime: "07:00", closeTime: "24:00",
  },
  {
    name: "天王洲アイル駐車場",
    slug: "tennozu-isle-parking",
    address: "東京都品川区東品川2-3-12",
    latitude: 35.6225, longitude: 139.7482,
    parkingType: "self_propelled", totalSpaces: 200,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5500, maxWidthMm: 2100, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 200 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 60 },
    ],
    is24h: true,
  },

  // --- 目黒区: 追加 ---
  {
    name: "アトレ目黒駐車場",
    slug: "atre-meguro-parking",
    address: "東京都品川区上大崎3-1-1",
    latitude: 35.6339, longitude: 139.7157,
    parkingType: "mechanical", totalSpaces: 80,
    restrictions: [
      { name: "普通車", maxLengthMm: 5000, maxWidthMm: 1850, maxHeightMm: 1550, maxWeightKg: 2000, spacesCount: 50 },
      { name: "ハイルーフ", maxLengthMm: 5000, maxWidthMm: 1850, maxHeightMm: 2050, maxWeightKg: 2000, spacesCount: 30 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 60 },
    ],
    is24h: false, openTime: "07:00", closeTime: "24:30",
  },
  {
    name: "自由が丘東急ストア駐車場",
    slug: "jiyugaoka-tokyu-store-parking",
    address: "東京都目黒区自由が丘1-28-8",
    latitude: 35.6076, longitude: 139.6695,
    parkingType: "mechanical", totalSpaces: 50,
    restrictions: [
      { name: "普通車", maxLengthMm: 4900, maxWidthMm: 1850, maxHeightMm: 1550, maxWeightKg: 2000, spacesCount: 30 },
      { name: "ハイルーフ", maxLengthMm: 4900, maxWidthMm: 1850, maxHeightMm: 2050, maxWeightKg: 2000, spacesCount: 20 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 60 },
    ],
    is24h: false, openTime: "08:00", closeTime: "22:00",
  },

  // --- 世田谷区: 追加 ---
  {
    name: "玉川高島屋S.C.駐車場",
    slug: "tamagawa-takashimaya-sc-parking",
    address: "東京都世田谷区玉川3-17-1",
    latitude: 35.6115, longitude: 139.6264,
    parkingType: "self_propelled", totalSpaces: 2000,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5500, maxWidthMm: 2200, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 2000 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 500, durationMinutes: 60 },
    ],
    is24h: false, openTime: "09:00", closeTime: "23:30",
  },
  {
    name: "経堂コルティ駐車場",
    slug: "kyodo-corty-parking",
    address: "東京都世田谷区経堂1-12-10",
    latitude: 35.6471, longitude: 139.6322,
    parkingType: "mechanical", totalSpaces: 44,
    restrictions: [
      { name: "普通車", maxLengthMm: 5000, maxWidthMm: 1850, maxHeightMm: 1550, maxWeightKg: 2000, spacesCount: 30 },
      { name: "ハイルーフ", maxLengthMm: 5000, maxWidthMm: 1850, maxHeightMm: 2050, maxWeightKg: 2000, spacesCount: 14 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 60 },
    ],
    is24h: false, openTime: "07:00", closeTime: "24:00",
  },

  // --- 大田区: 追加 ---
  {
    name: "グランデュオ蒲田西館駐車場",
    slug: "granduo-kamata-west-parking",
    address: "東京都大田区西蒲田7-68-1",
    latitude: 35.5627, longitude: 139.7137,
    parkingType: "mechanical", totalSpaces: 110,
    restrictions: [
      { name: "普通車", maxLengthMm: 5050, maxWidthMm: 1850, maxHeightMm: 1550, maxWeightKg: 2000, spacesCount: 70 },
      { name: "ハイルーフ", maxLengthMm: 5050, maxWidthMm: 1850, maxHeightMm: 2050, maxWeightKg: 2000, spacesCount: 40 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 60 },
    ],
    is24h: false, openTime: "10:00", closeTime: "22:00",
  },

  // --- 足立区: 追加 ---
  {
    name: "アリオ西新井駐車場",
    slug: "ario-nishiarai-parking",
    address: "東京都足立区西新井栄町1-20-1",
    latitude: 35.7745, longitude: 139.7820,
    parkingType: "self_propelled", totalSpaces: 1300,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5500, maxWidthMm: 2200, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 1300 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 300, durationMinutes: 60, notes: "最初の2時間無料" },
    ],
    is24h: false, openTime: "09:00", closeTime: "24:00",
  },
  {
    name: "ルミネ北千住駐車場",
    slug: "lumine-kitasenju-parking",
    address: "東京都足立区千住旭町42-2",
    latitude: 35.7493, longitude: 139.8044,
    parkingType: "mechanical", totalSpaces: 90,
    restrictions: [
      { name: "普通車", maxLengthMm: 5000, maxWidthMm: 1850, maxHeightMm: 1550, maxWeightKg: 2000, spacesCount: 60 },
      { name: "ハイルーフ", maxLengthMm: 5000, maxWidthMm: 1850, maxHeightMm: 2050, maxWeightKg: 2000, spacesCount: 30 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 60 },
    ],
    is24h: false, openTime: "10:00", closeTime: "22:30",
  },

  // --- 葛飾区: 追加 ---
  {
    name: "アリオ亀有駐車場",
    slug: "ario-kameari-parking",
    address: "東京都葛飾区亀有3-49-3",
    latitude: 35.7620, longitude: 139.8469,
    parkingType: "self_propelled", totalSpaces: 900,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5500, maxWidthMm: 2200, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 900 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 300, durationMinutes: 60, notes: "最初の1時間無料" },
    ],
    is24h: false, openTime: "09:00", closeTime: "24:00",
  },

  // --- 江戸川区: 追加 ---
  {
    name: "イオン葛西店駐車場",
    slug: "aeon-kasai-parking",
    address: "東京都江戸川区西葛西3-9-19",
    latitude: 35.6618, longitude: 139.8540,
    parkingType: "self_propelled", totalSpaces: 700,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5500, maxWidthMm: 2200, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 700 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 300, durationMinutes: 60, notes: "最初の3時間無料" },
    ],
    is24h: false, openTime: "09:00", closeTime: "23:00",
  },

  // --- 練馬区: 追加 ---
  {
    name: "光が丘IMA駐車場",
    slug: "hikarigaoka-ima-parking",
    address: "東京都練馬区光が丘5-1-1",
    latitude: 35.7593, longitude: 139.6312,
    parkingType: "self_propelled", totalSpaces: 570,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5500, maxWidthMm: 2000, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 570 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 300, durationMinutes: 60, notes: "最初の1時間無料" },
    ],
    is24h: false, openTime: "08:00", closeTime: "23:00",
  },
  {
    name: "西武練馬店駐車場",
    slug: "seibu-nerima-parking",
    address: "東京都練馬区練馬1-5-1",
    latitude: 35.7368, longitude: 139.6523,
    parkingType: "mechanical", totalSpaces: 100,
    restrictions: [
      { name: "普通車", maxLengthMm: 5050, maxWidthMm: 1850, maxHeightMm: 1550, maxWeightKg: 2000, spacesCount: 60 },
      { name: "ハイルーフ", maxLengthMm: 5050, maxWidthMm: 1850, maxHeightMm: 2050, maxWeightKg: 2000, spacesCount: 40 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 60 },
    ],
    is24h: false, openTime: "10:00", closeTime: "21:30",
  },

  // --- 中野区: 追加 ---
  {
    name: "中野サンモール駐車場",
    slug: "nakano-sunmall-parking",
    address: "東京都中野区中野5-64",
    latitude: 35.7063, longitude: 139.6658,
    parkingType: "mechanical", totalSpaces: 60,
    restrictions: [
      { name: "普通車", maxLengthMm: 5000, maxWidthMm: 1850, maxHeightMm: 1550, maxWeightKg: 2000, spacesCount: 40 },
      { name: "ハイルーフ", maxLengthMm: 5000, maxWidthMm: 1850, maxHeightMm: 2050, maxWeightKg: 2000, spacesCount: 20 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 60 },
    ],
    is24h: false, openTime: "09:00", closeTime: "22:00",
  },

  // --- 杉並区: 追加 ---
  {
    name: "ルミネ荻窪駐車場",
    slug: "lumine-ogikubo-parking",
    address: "東京都杉並区上荻1-7-1",
    latitude: 35.7035, longitude: 139.6200,
    parkingType: "mechanical", totalSpaces: 48,
    restrictions: [
      { name: "普通車", maxLengthMm: 5000, maxWidthMm: 1850, maxHeightMm: 1550, maxWeightKg: 2000, spacesCount: 30 },
      { name: "ハイルーフ", maxLengthMm: 5000, maxWidthMm: 1850, maxHeightMm: 2050, maxWeightKg: 2000, spacesCount: 18 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 60 },
    ],
    is24h: false, openTime: "07:00", closeTime: "23:00",
  },

  // --- 板橋区: 追加 ---
  {
    name: "イオンスタイル板橋前野町駐車場",
    slug: "aeon-itabashi-maenomachi-parking",
    address: "東京都板橋区前野町4-21-22",
    latitude: 35.7686, longitude: 139.6805,
    parkingType: "self_propelled", totalSpaces: 600,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5500, maxWidthMm: 2200, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 600 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 300, durationMinutes: 60, notes: "最初の3時間無料" },
    ],
    is24h: false, openTime: "08:00", closeTime: "23:00",
  },
  {
    name: "成増スキップ村パーキング",
    slug: "narimasu-skip-mura-parking",
    address: "東京都板橋区成増2-11-1",
    latitude: 35.7783, longitude: 139.6313,
    parkingType: "mechanical", totalSpaces: 60,
    restrictions: [
      { name: "普通車", maxLengthMm: 5000, maxWidthMm: 1850, maxHeightMm: 1550, maxWeightKg: 2000, spacesCount: 40 },
      { name: "ハイルーフ", maxLengthMm: 5000, maxWidthMm: 1850, maxHeightMm: 2050, maxWeightKg: 2000, spacesCount: 20 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 300, durationMinutes: 60 },
    ],
    is24h: false, openTime: "08:00", closeTime: "23:00",
  },

  // --- 北区: 追加 ---
  {
    name: "アピレ赤羽駐車場",
    slug: "apire-akabane-parking",
    address: "東京都北区赤羽西1-6-1",
    latitude: 35.7776, longitude: 139.7207,
    parkingType: "mechanical", totalSpaces: 70,
    restrictions: [
      { name: "普通車", maxLengthMm: 5000, maxWidthMm: 1850, maxHeightMm: 1550, maxWeightKg: 2000, spacesCount: 45 },
      { name: "ハイルーフ", maxLengthMm: 5000, maxWidthMm: 1850, maxHeightMm: 2050, maxWeightKg: 2000, spacesCount: 25 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 60 },
    ],
    is24h: false, openTime: "10:00", closeTime: "21:00",
  },

  // --- 荒川区: 追加 ---
  {
    name: "LaLaテラス南千住駐車場",
    slug: "lalaterrace-minamisenju-parking",
    address: "東京都荒川区南千住4-7-2",
    latitude: 35.7349, longitude: 139.7962,
    parkingType: "self_propelled", totalSpaces: 250,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5500, maxWidthMm: 2000, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 250 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 300, durationMinutes: 60, notes: "最初の2時間無料" },
    ],
    is24h: false, openTime: "09:00", closeTime: "23:00",
  },

  // --- 千代田区: 追加 ---
  {
    name: "有楽町イトシア駐車場",
    slug: "yurakucho-itocia-parking",
    address: "東京都千代田区有楽町2-7-1",
    latitude: 35.6736, longitude: 139.7627,
    parkingType: "mechanical", totalSpaces: 270,
    restrictions: [
      { name: "普通車", maxLengthMm: 5300, maxWidthMm: 1900, maxHeightMm: 1550, maxWeightKg: 2500, spacesCount: 170 },
      { name: "ハイルーフ", maxLengthMm: 5300, maxWidthMm: 1900, maxHeightMm: 2050, maxWeightKg: 2500, spacesCount: 100 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 500, durationMinutes: 60 },
    ],
    is24h: false, openTime: "06:00", closeTime: "02:00",
  },
  {
    name: "秋葉原UDXパーキング",
    slug: "akihabara-udx-parking",
    address: "東京都千代田区外神田4-14-1",
    latitude: 35.6999, longitude: 139.7710,
    parkingType: "self_propelled", totalSpaces: 800,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5300, maxWidthMm: 2050, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 800 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: true,
  },
  {
    name: "有楽町センタービル駐車場",
    slug: "yurakucho-center-building-parking",
    address: "東京都千代田区有楽町1-1",
    latitude: 35.6750, longitude: 139.7612,
    parkingType: "self_propelled", totalSpaces: 480,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5500, maxWidthMm: 2200, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 480 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: false, openTime: "06:00", closeTime: "24:00",
  },

  // --- 追加6件 (95-100) ---
  {
    name: "東京ガーデンテラス紀尾井町駐車場",
    slug: "tokyo-garden-terrace-kioicho-parking",
    address: "東京都千代田区紀尾井町1-2",
    latitude: 35.6813, longitude: 139.7354,
    parkingType: "self_propelled", totalSpaces: 200,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5500, maxWidthMm: 2200, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 200 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: false, openTime: "06:00", closeTime: "24:00",
  },
  {
    name: "恵比寿ガーデンプレイス駐車場",
    slug: "ebisu-garden-place-parking",
    address: "東京都渋谷区恵比寿4-20",
    latitude: 35.6413, longitude: 139.7135,
    parkingType: "self_propelled", totalSpaces: 670,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5500, maxWidthMm: 2200, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 670 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 500, durationMinutes: 60 },
    ],
    is24h: false, openTime: "06:00", closeTime: "24:00",
  },
  {
    name: "アトレ吉祥寺駐車場",
    slug: "atre-kichijoji-parking",
    address: "東京都武蔵野市吉祥寺南町1-1-24",
    latitude: 35.7023, longitude: 139.5797,
    parkingType: "mechanical", totalSpaces: 80,
    restrictions: [
      { name: "普通車", maxLengthMm: 5000, maxWidthMm: 1850, maxHeightMm: 1550, maxWeightKg: 2000, spacesCount: 50 },
      { name: "ハイルーフ", maxLengthMm: 5000, maxWidthMm: 1850, maxHeightMm: 2050, maxWeightKg: 2000, spacesCount: 30 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 60 },
    ],
    is24h: false, openTime: "07:00", closeTime: "24:00",
  },
  {
    name: "東京オペラシティ駐車場",
    slug: "tokyo-opera-city-parking",
    address: "東京都新宿区西新宿3-20-2",
    latitude: 35.6838, longitude: 139.6886,
    parkingType: "self_propelled", totalSpaces: 200,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5500, maxWidthMm: 2200, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 200 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 500, durationMinutes: 60 },
    ],
    is24h: false, openTime: "07:00", closeTime: "24:00",
  },
  {
    name: "品川シーサイドフォレスト駐車場",
    slug: "shinagawa-seaside-forest-parking",
    address: "東京都品川区東品川4-12-4",
    latitude: 35.6097, longitude: 139.7483,
    parkingType: "self_propelled", totalSpaces: 700,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5500, maxWidthMm: 2200, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 700 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 300, durationMinutes: 60 },
    ],
    is24h: false, openTime: "07:00", closeTime: "24:00",
  },
  {
    name: "イオンモール板橋駐車場",
    slug: "aeon-mall-itabashi-parking",
    address: "東京都板橋区徳丸2-6-1",
    latitude: 35.7810, longitude: 139.6707,
    parkingType: "self_propelled", totalSpaces: 1100,
    restrictions: [
      { name: "全車共通", maxLengthMm: 5500, maxWidthMm: 2200, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 1100 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 300, durationMinutes: 60, notes: "最初の3時間無料" },
    ],
    is24h: false, openTime: "08:00", closeTime: "23:00",
  },

  // ============================================================
  // Phase 1: 東京駅/丸の内/八重洲エリア
  // ============================================================

  // --- 千代田区: 丸の内エリア ---
  {
    name: "KITTE丸の内駐車場（JPタワー）",
    slug: "kitte-marunouchi-parking",
    address: "東京都千代田区丸の内2-7-2",
    latitude: 35.6798, longitude: 139.7649,
    parkingType: "mechanical", totalSpaces: 260,
    facilityType: "commercial_facility",
    restrictions: [
      { name: "B2自走式", maxLengthMm: 6200, maxWidthMm: 2200, maxHeightMm: 3100, maxWeightKg: 6000, spacesCount: 130 },
      { name: "B3機械式", maxLengthMm: 5300, maxWidthMm: 1950, maxHeightMm: 2300, maxWeightKg: 2500, spacesCount: 130 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 800, durationMinutes: 60 },
    ],
    is24h: false, openTime: "06:00", closeTime: "23:00",
  },
  {
    name: "丸ビル駐車場（丸の内パークイン）",
    slug: "marunouchi-building-parking",
    address: "東京都千代田区丸の内2-4-1",
    latitude: 35.6815, longitude: 139.7636,
    parkingType: "self_propelled", totalSpaces: 350,
    facilityType: "commercial_facility",
    restrictions: [
      { name: "全車共通", maxLengthMm: 6500, maxWidthMm: 2300, maxHeightMm: 3000, maxWeightKg: 3000, spacesCount: 350 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 800, durationMinutes: 60 },
    ],
    is24h: false, openTime: "06:00", closeTime: "24:00",
  },
  {
    name: "新丸ビル駐車場（丸の内パークイン）",
    slug: "shin-marunouchi-building-parking",
    address: "東京都千代田区丸の内1-5-1",
    latitude: 35.6822, longitude: 139.7644,
    parkingType: "self_propelled", totalSpaces: 330,
    facilityType: "commercial_facility",
    restrictions: [
      { name: "全車共通", maxLengthMm: 6000, maxWidthMm: 2200, maxHeightMm: 3000, maxWeightKg: 3000, spacesCount: 330 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 800, durationMinutes: 60 },
    ],
    is24h: true,
  },
  {
    name: "東京ビルTOKIA駐車場（丸の内パークイン）",
    slug: "tokyo-building-tokia-parking",
    address: "東京都千代田区丸の内2-7-3",
    latitude: 35.6786, longitude: 139.7650,
    parkingType: "self_propelled", totalSpaces: 225,
    facilityType: "commercial_facility",
    restrictions: [
      { name: "全車共通", maxLengthMm: 6000, maxWidthMm: 2100, maxHeightMm: 3000, maxWeightKg: 3000, spacesCount: 225 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 800, durationMinutes: 60 },
    ],
    is24h: false, openTime: "06:00", closeTime: "24:00",
  },

  // --- 中央区: 八重洲エリア ---
  {
    name: "東京都八重洲駐車場",
    slug: "yaesu-underground-parking",
    address: "東京都中央区八重洲1丁目",
    latitude: 35.6808, longitude: 139.7706,
    parkingType: "self_propelled", totalSpaces: 265,
    facilityType: "public_facility",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5200, maxWidthMm: 2100, maxHeightMm: 2000, maxWeightKg: 2500, spacesCount: 265 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 500, durationMinutes: 60 },
    ],
    is24h: true,
  },
  {
    name: "東京ミッドタウン八重洲駐車場",
    slug: "tokyo-midtown-yaesu-parking",
    address: "東京都中央区八重洲2-2-1",
    latitude: 35.6794, longitude: 139.7689,
    parkingType: "mechanical", totalSpaces: 124,
    facilityType: "commercial_facility",
    restrictions: [
      { name: "普通車", maxLengthMm: 5600, maxWidthMm: 2050, maxHeightMm: 1550, maxWeightKg: 2500, spacesCount: 40 },
      { name: "ミドルルーフ", maxLengthMm: 5600, maxWidthMm: 2050, maxHeightMm: 1850, maxWeightKg: 2500, spacesCount: 40 },
      { name: "ハイルーフ", maxLengthMm: 5600, maxWidthMm: 2050, maxHeightMm: 2000, maxWeightKg: 2500, spacesCount: 44 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: true,
  },
  {
    name: "ヤエチカパーキング",
    slug: "yaechika-parking",
    address: "東京都中央区八重洲2-1",
    latitude: 35.6795, longitude: 139.7710,
    parkingType: "self_propelled", totalSpaces: 774,
    facilityType: "commercial_facility",
    restrictions: [
      { name: "自走式", maxLengthMm: 6000, maxWidthMm: 2000, maxHeightMm: 2100, maxWeightKg: 4000, spacesCount: 569 },
      { name: "B3F機械式ノース", maxLengthMm: 5000, maxWidthMm: 1850, maxHeightMm: 1550, maxWeightKg: 1900, spacesCount: 103 },
      { name: "B3F機械式サウス", maxLengthMm: 5000, maxWidthMm: 1800, maxHeightMm: 1550, maxWeightKg: 1900, spacesCount: 102 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 760, durationMinutes: 60 },
    ],
    is24h: true,
  },

  // --- 千代田区: 大手町エリア ---
  {
    name: "大手町パークビルディング駐車場",
    slug: "otemachi-park-building-parking",
    address: "東京都千代田区大手町1-1-1",
    latitude: 35.6867, longitude: 139.7630,
    parkingType: "self_propelled", totalSpaces: 180,
    facilityType: "office_building",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5250, maxWidthMm: 1900, maxHeightMm: 2050, maxWeightKg: 2500, spacesCount: 180 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 800, durationMinutes: 60 },
    ],
    is24h: false, openTime: "07:00", closeTime: "22:00",
  },
  {
    name: "大手町プレイス駐車場",
    slug: "otemachi-place-parking",
    address: "東京都千代田区大手町2-3",
    latitude: 35.6853, longitude: 139.7672,
    parkingType: "mechanical", totalSpaces: 99,
    facilityType: "office_building",
    restrictions: [
      { name: "普通車", maxLengthMm: 5300, maxWidthMm: 2000, maxHeightMm: 1550, maxWeightKg: 2500, spacesCount: 50 },
      { name: "ハイルーフ", maxLengthMm: 5300, maxWidthMm: 2000, maxHeightMm: 2050, maxWeightKg: 2500, spacesCount: 49 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 800, durationMinutes: 60 },
    ],
    is24h: false, openTime: "07:00", closeTime: "23:00",
  },

  // --- その他 Phase 1 施設 ---
  {
    name: "NEWoMan新宿駐車場（JR新宿ミライナタワー）",
    slug: "newoman-shinjuku-parking",
    address: "東京都渋谷区千駄ヶ谷5-24",
    latitude: 35.6886, longitude: 139.7017,
    parkingType: "mechanical", totalSpaces: 152,
    facilityType: "commercial_facility",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5300, maxWidthMm: 1900, maxHeightMm: 2100, maxWeightKg: 2300, spacesCount: 152 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 800, durationMinutes: 60 },
    ],
    is24h: false, openTime: "08:00", closeTime: "23:30",
  },
  {
    name: "渋谷フクラス駐車場（東急プラザ渋谷）",
    slug: "shibuya-fukuras-parking",
    address: "東京都渋谷区道玄坂1-2-3",
    latitude: 35.6591, longitude: 139.6988,
    parkingType: "mechanical", totalSpaces: 50,
    facilityType: "commercial_facility",
    restrictions: [
      { name: "普通車", maxLengthMm: 5300, maxWidthMm: 1930, maxHeightMm: 1550, maxWeightKg: 2400, spacesCount: 50 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 800, durationMinutes: 60 },
    ],
    is24h: false, openTime: "07:00", closeTime: "23:00",
  },
  {
    name: "東京タワー地下駐車場",
    slug: "tokyo-tower-underground-parking",
    address: "東京都港区芝公園4-2-8",
    latitude: 35.6586, longitude: 139.7454,
    parkingType: "self_propelled", totalSpaces: 150,
    facilityType: "other",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5000, maxWidthMm: 1900, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 150 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 800, durationMinutes: 60 },
    ],
    is24h: false, openTime: "05:30", closeTime: "00:30",
  },
  {
    name: "日比谷駐車場",
    slug: "hibiya-parking",
    address: "東京都千代田区日比谷公園1-6",
    latitude: 35.6739, longitude: 139.7570,
    parkingType: "self_propelled", totalSpaces: 463,
    facilityType: "public_facility",
    restrictions: [
      { name: "全車共通", maxLengthMm: 6500, maxWidthMm: 2500, maxHeightMm: 2200, maxWeightKg: 4000, spacesCount: 463 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 720, durationMinutes: 60 },
    ],
    is24h: true,
  },
  {
    name: "東京国際フォーラム地下駐車場",
    slug: "tokyo-international-forum-parking",
    address: "東京都千代田区丸の内3-5-1",
    latitude: 35.6764, longitude: 139.7636,
    parkingType: "self_propelled", totalSpaces: 417,
    facilityType: "public_facility",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5400, maxWidthMm: 1900, maxHeightMm: 2200, maxWeightKg: 2500, spacesCount: 417 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 60 },
    ],
    is24h: false, openTime: "07:00", closeTime: "23:30",
  },

  // ============================================================
  // Phase 2: 病院（大学病院・総合病院）
  // ============================================================
  {
    name: "順天堂医院駐車場（1号館機械式）",
    slug: "juntendo-hospital-mechanical-parking",
    address: "東京都文京区本郷3-1-3",
    latitude: 35.7024, longitude: 139.7626,
    parkingType: "mechanical", totalSpaces: 78,
    facilityType: "hospital",
    restrictions: [
      { name: "普通車", maxLengthMm: 5300, maxWidthMm: 2050, maxHeightMm: 1550, maxWeightKg: 2300, spacesCount: 78 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: false, openTime: "07:00", closeTime: "20:00",
  },
  {
    name: "順天堂医院駐車場（B棟機械式）",
    slug: "juntendo-hospital-b-mechanical-parking",
    address: "東京都文京区本郷3-1-3",
    latitude: 35.7024, longitude: 139.7626,
    parkingType: "mechanical", totalSpaces: 110,
    facilityType: "hospital",
    restrictions: [
      { name: "ハイルーフ", maxLengthMm: 5600, maxWidthMm: 1950, maxHeightMm: 2050, maxWeightKg: 2300, spacesCount: 110 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: false, openTime: "07:00", closeTime: "20:00",
  },
  {
    name: "聖路加国際病院駐車場",
    slug: "st-lukes-hospital-parking",
    address: "東京都中央区明石町9-1",
    latitude: 35.6671, longitude: 139.7775,
    parkingType: "self_propelled", totalSpaces: 136,
    facilityType: "hospital",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5000, maxWidthMm: 1900, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 136 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 550, durationMinutes: 60 },
    ],
    is24h: false, openTime: "06:30", closeTime: "21:45",
  },
  {
    name: "虎の門病院駐車場",
    slug: "toranomon-hospital-parking",
    address: "東京都港区虎ノ門2-2-2",
    latitude: 35.6653, longitude: 139.7454,
    parkingType: "mechanical", totalSpaces: 190,
    facilityType: "hospital",
    restrictions: [
      { name: "普通車", maxLengthMm: 5300, maxWidthMm: 1950, maxHeightMm: 1550, maxWeightKg: 2300, spacesCount: 95 },
      { name: "ハイルーフ", maxLengthMm: 5300, maxWidthMm: 1950, maxHeightMm: 2050, maxWeightKg: 2300, spacesCount: 95 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 800, durationMinutes: 60 },
    ],
    is24h: false, openTime: "07:00", closeTime: "20:30",
  },
  {
    name: "国立がん研究センター中央病院駐車場",
    slug: "national-cancer-center-parking",
    address: "東京都中央区築地5-1-1",
    latitude: 35.6653, longitude: 139.7682,
    parkingType: "self_propelled", totalSpaces: 391,
    facilityType: "hospital",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5000, maxWidthMm: 1900, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 391 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 200, durationMinutes: 60, notes: "患者30分無料" },
    ],
    is24h: true,
  },
  {
    name: "日本医科大学付属病院駐車場",
    slug: "nippon-medical-school-hospital-parking",
    address: "東京都文京区千駄木1-1-5",
    latitude: 35.7209, longitude: 139.7590,
    parkingType: "mechanical", totalSpaces: 163,
    facilityType: "hospital",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5300, maxWidthMm: 1950, maxHeightMm: 2000, maxWeightKg: 2300, spacesCount: 163 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 800, durationMinutes: 60, notes: "外来患者1時間無料" },
    ],
    is24h: false, openTime: "07:00", closeTime: "21:00",
  },
  {
    name: "東京慈恵会医科大学附属病院駐車場（外来棟）",
    slug: "jikei-hospital-outpatient-parking",
    address: "東京都港区西新橋3-25-8",
    latitude: 35.6624, longitude: 139.7499,
    parkingType: "self_propelled", totalSpaces: 86,
    facilityType: "hospital",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5200, maxWidthMm: 1850, maxHeightMm: 2000, maxWeightKg: 2300, spacesCount: 86 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 800, durationMinutes: 60 },
    ],
    is24h: false, openTime: "07:00", closeTime: "21:00",
  },
  {
    name: "東京慈恵会医科大学附属病院駐車場（E棟）",
    slug: "jikei-hospital-e-building-parking",
    address: "東京都港区西新橋3-25-8",
    latitude: 35.6624, longitude: 139.7499,
    parkingType: "mechanical", totalSpaces: 52,
    facilityType: "hospital",
    restrictions: [
      { name: "普通車（小型車限定）", maxLengthMm: 4850, maxWidthMm: 1950, maxHeightMm: 1500, maxWeightKg: 1500, spacesCount: 52, notes: "タイヤ幅1,700mm以内" },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: false, openTime: "08:00", closeTime: "20:00",
  },
  {
    name: "東京医科大学病院駐車場",
    slug: "tokyo-medical-university-hospital-parking",
    address: "東京都新宿区西新宿6-7-1",
    latitude: 35.6934, longitude: 139.6919,
    parkingType: "self_propelled", totalSpaces: 409,
    facilityType: "hospital",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5000, maxWidthMm: 1900, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 409 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 60 },
    ],
    is24h: true,
  },
  {
    name: "日本大学病院駐車場",
    slug: "nihon-university-hospital-parking",
    address: "東京都千代田区神田駿河台2-6",
    latitude: 35.6975, longitude: 139.7624,
    parkingType: "self_propelled", totalSpaces: 214,
    facilityType: "hospital",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5000, maxWidthMm: 1900, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 214 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 1200, durationMinutes: 60 },
    ],
    is24h: false, openTime: "07:00", closeTime: "23:00",
  },
  {
    name: "昭和大学病院駐車場（A区画）",
    slug: "showa-university-hospital-a-parking",
    address: "東京都品川区旗の台1-5-8",
    latitude: 35.6084, longitude: 139.7036,
    parkingType: "mechanical", totalSpaces: 22,
    facilityType: "hospital",
    restrictions: [
      { name: "ミドルルーフ", maxLengthMm: 5150, maxWidthMm: 2000, maxHeightMm: 1800, maxWeightKg: 2300, spacesCount: 22 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 500, durationMinutes: 60, notes: "最初30分無料" },
    ],
    is24h: false, openTime: "07:30", closeTime: "20:00",
  },
  {
    name: "昭和大学病院駐車場（B区画）",
    slug: "showa-university-hospital-b-parking",
    address: "東京都品川区旗の台1-5-8",
    latitude: 35.6084, longitude: 139.7036,
    parkingType: "mechanical", totalSpaces: 48,
    facilityType: "hospital",
    restrictions: [
      { name: "普通車（小型車限定）", maxLengthMm: 4700, maxWidthMm: 1700, maxHeightMm: 1550, maxWeightKg: 1500, spacesCount: 48 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 500, durationMinutes: 60, notes: "最初30分無料" },
    ],
    is24h: false, openTime: "07:30", closeTime: "20:00",
  },
  {
    name: "東京大学医学部附属病院駐車場",
    slug: "todai-hospital-parking",
    address: "東京都文京区本郷7-3-1",
    latitude: 35.7126, longitude: 139.7653,
    parkingType: "self_propelled", totalSpaces: 301,
    facilityType: "hospital",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5000, maxWidthMm: 1900, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 301 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 300, durationMinutes: 60, notes: "患者30分無料" },
    ],
    is24h: false, openTime: "07:00", closeTime: "20:30",
  },
  {
    name: "NTT東日本関東病院駐車場",
    slug: "ntt-east-kanto-hospital-parking",
    address: "東京都品川区東五反田5-9-22",
    latitude: 35.6275, longitude: 139.7231,
    parkingType: "self_propelled", totalSpaces: 150,
    facilityType: "hospital",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5000, maxWidthMm: 1900, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 150 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 60 },
    ],
    is24h: true,
  },

  // ============================================================
  // Phase 3: ホテル
  // ============================================================
  {
    name: "帝国ホテル東京駐車場",
    slug: "imperial-hotel-tokyo-parking",
    address: "東京都千代田区内幸町1-1-1",
    latitude: 35.6725, longitude: 139.7584,
    parkingType: "self_propelled", totalSpaces: 425,
    facilityType: "hotel",
    restrictions: [
      { name: "全車共通", maxLengthMm: 6000, maxWidthMm: 1950, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 425 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 1200, durationMinutes: 60 },
    ],
    is24h: true,
  },
  {
    name: "ホテルニューオータニ東京駐車場",
    slug: "hotel-new-otani-tokyo-parking",
    address: "東京都千代田区紀尾井町4-1",
    latitude: 35.6802, longitude: 139.7350,
    parkingType: "self_propelled", totalSpaces: 760,
    facilityType: "hotel",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5500, maxWidthMm: 2200, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 760 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 1000, durationMinutes: 60 },
    ],
    is24h: true,
  },
  {
    name: "The Okura Tokyo駐車場",
    slug: "okura-tokyo-parking",
    address: "東京都港区虎ノ門2-10-4",
    latitude: 35.6656, longitude: 139.7444,
    parkingType: "self_propelled", totalSpaces: 200,
    facilityType: "hotel",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5300, maxWidthMm: 2100, maxHeightMm: 2200, maxWeightKg: 2500, spacesCount: 200 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 1000, durationMinutes: 60 },
    ],
    is24h: true,
  },
  {
    name: "パレスホテル東京駐車場",
    slug: "palace-hotel-tokyo-parking",
    address: "東京都千代田区丸の内1-1-1",
    latitude: 35.6846, longitude: 139.7613,
    parkingType: "self_propelled", totalSpaces: 350,
    facilityType: "hotel",
    restrictions: [
      { name: "全車共通", maxLengthMm: 6500, maxWidthMm: 3000, maxHeightMm: 2500, maxWeightKg: 3000, spacesCount: 350 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 1000, durationMinutes: 60 },
    ],
    is24h: false, openTime: "06:00", closeTime: "24:00",
  },
  {
    name: "ザ・ペニンシュラ東京駐車場",
    slug: "peninsula-tokyo-parking",
    address: "東京都千代田区有楽町1-8-1",
    latitude: 35.6749, longitude: 139.7602,
    parkingType: "tower", totalSpaces: 120,
    facilityType: "hotel",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5300, maxWidthMm: 1900, maxHeightMm: 2700, maxWeightKg: 2500, spacesCount: 120 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 1200, durationMinutes: 60 },
    ],
    is24h: true,
  },
  {
    name: "コンラッド東京駐車場",
    slug: "conrad-tokyo-parking",
    address: "東京都港区東新橋1-9-1",
    latitude: 35.6630, longitude: 139.7612,
    parkingType: "self_propelled", totalSpaces: 80,
    facilityType: "hotel",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5800, maxWidthMm: 1900, maxHeightMm: 2200, maxWeightKg: 2500, spacesCount: 80 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: true,
  },
  {
    name: "ウェスティンホテル東京駐車場",
    slug: "westin-tokyo-parking",
    address: "東京都目黒区三田1-4-1",
    latitude: 35.6415, longitude: 139.7154,
    parkingType: "self_propelled", totalSpaces: 200,
    facilityType: "hotel",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5800, maxWidthMm: 2300, maxHeightMm: 2300, maxWeightKg: 2500, spacesCount: 200 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 1200, durationMinutes: 60 },
    ],
    is24h: true,
  },
  {
    name: "シャングリ・ラ東京駐車場（丸の内トラストタワー）",
    slug: "shangri-la-tokyo-parking",
    address: "東京都千代田区丸の内1-8-3",
    latitude: 35.6824, longitude: 139.7693,
    parkingType: "self_propelled", totalSpaces: 80,
    facilityType: "hotel",
    restrictions: [
      { name: "全車共通", maxLengthMm: 6000, maxWidthMm: 2300, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 80 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 800, durationMinutes: 60 },
    ],
    is24h: true,
  },
  {
    name: "ANAインターコンチネンタルホテル東京駐車場",
    slug: "ana-intercontinental-tokyo-parking",
    address: "東京都港区赤坂1-12-33",
    latitude: 35.6681, longitude: 139.7409,
    parkingType: "self_propelled", totalSpaces: 500,
    facilityType: "hotel",
    restrictions: [
      { name: "全車共通", maxLengthMm: 6000, maxWidthMm: 2500, maxHeightMm: 2100, maxWeightKg: 3000, spacesCount: 500 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 1200, durationMinutes: 60 },
    ],
    is24h: true,
  },
  {
    name: "ホテル椿山荘東京駐車場",
    slug: "chinzanso-tokyo-parking",
    address: "東京都文京区関口2-10-8",
    latitude: 35.7121, longitude: 139.7262,
    parkingType: "self_propelled", totalSpaces: 500,
    facilityType: "hotel",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5500, maxWidthMm: 2200, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 500 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 1000, durationMinutes: 60 },
    ],
    is24h: true,
  },
  {
    name: "フォーシーズンズホテル東京大手町駐車場",
    slug: "four-seasons-otemachi-parking",
    address: "東京都千代田区大手町1-2-1",
    latitude: 35.6881, longitude: 139.7634,
    parkingType: "mechanical", totalSpaces: 80,
    facilityType: "hotel",
    restrictions: [
      { name: "普通車", maxLengthMm: 5300, maxWidthMm: 2000, maxHeightMm: 1500, maxWeightKg: 2500, spacesCount: 80 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: false, openTime: "06:00", closeTime: "00:30",
  },

  // ============================================================
  // Phase 4: 羽田空港
  // ============================================================
  {
    name: "羽田空港 P1駐車場（第1ターミナル）",
    slug: "haneda-airport-p1-parking",
    address: "東京都大田区羽田空港3-3-3",
    latitude: 35.5490, longitude: 139.7818,
    parkingType: "self_propelled", totalSpaces: 2351,
    facilityType: "airport",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5700, maxWidthMm: 2100, maxHeightMm: 2300, maxWeightKg: 2500, spacesCount: 2351 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 60, notes: "最初30分無料、24h上限2,800円" },
    ],
    is24h: true,
  },
  {
    name: "羽田空港 P2駐車場（第1ターミナル）",
    slug: "haneda-airport-p2-parking",
    address: "東京都大田区羽田空港3-3-5",
    latitude: 35.5505, longitude: 139.7835,
    parkingType: "self_propelled", totalSpaces: 2315,
    facilityType: "airport",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5700, maxWidthMm: 2100, maxHeightMm: 2300, maxWeightKg: 2500, spacesCount: 2315 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 60, notes: "最初30分無料、24h上限2,800円" },
    ],
    is24h: true,
  },
  {
    name: "羽田空港 P3駐車場（第2ターミナル）",
    slug: "haneda-airport-p3-parking",
    address: "東京都大田区羽田空港3-4-4",
    latitude: 35.5467, longitude: 139.7907,
    parkingType: "self_propelled", totalSpaces: 2449,
    facilityType: "airport",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5700, maxWidthMm: 2100, maxHeightMm: 2300, maxWeightKg: 2500, spacesCount: 2449 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 60, notes: "最初30分無料、24h上限2,800円" },
    ],
    is24h: true,
  },
  {
    name: "羽田空港 P4駐車場（第2ターミナル）",
    slug: "haneda-airport-p4-parking",
    address: "東京都大田区羽田空港3-4-5",
    latitude: 35.5483, longitude: 139.7925,
    parkingType: "self_propelled", totalSpaces: 3087,
    facilityType: "airport",
    restrictions: [
      { name: "立体普通車", maxLengthMm: 5700, maxWidthMm: 2100, maxHeightMm: 2300, maxWeightKg: 2500, spacesCount: 2407 },
      { name: "平面ハイルーフ", maxLengthMm: 7000, maxWidthMm: 2500, maxHeightMm: 3100, maxWeightKg: 3500, spacesCount: 16, notes: "マイクロバス対応" },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 60, notes: "最初30分無料、24h上限2,800円" },
    ],
    is24h: true,
  },
  {
    name: "羽田空港 P5駐車場（第3ターミナル/国際線）",
    slug: "haneda-airport-p5-parking",
    address: "東京都大田区羽田空港2-6-5",
    latitude: 35.5450, longitude: 139.7750,
    parkingType: "self_propelled", totalSpaces: 3000,
    facilityType: "airport",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5700, maxWidthMm: 2100, maxHeightMm: 2300, maxWeightKg: 2500, spacesCount: 3000 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 400, durationMinutes: 60, notes: "最初30分無料、24h上限2,800円" },
    ],
    is24h: true,
  },
  {
    name: "羽田イノベーションシティ駐車場",
    slug: "haneda-innovation-city-parking",
    address: "東京都大田区羽田空港1-1-4",
    latitude: 35.5530, longitude: 139.7700,
    parkingType: "self_propelled", totalSpaces: 245,
    facilityType: "airport",
    restrictions: [
      { name: "P1平面", maxLengthMm: 7790, maxWidthMm: 2240, maxHeightMm: 2000, maxWeightKg: 2500, spacesCount: 190 },
      { name: "P2機械式", maxLengthMm: 5000, maxWidthMm: 1900, maxHeightMm: 2000, maxWeightKg: 2500, spacesCount: 55 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 440, durationMinutes: 60, notes: "最初30分無料" },
    ],
    is24h: true,
  },

  // ============================================================
  // Phase 5: お台場/臨海エリア + レジャー施設
  // ============================================================
  {
    name: "アクアシティお台場駐車場",
    slug: "aqua-city-odaiba-parking",
    address: "東京都港区台場1-7-1",
    latitude: 35.6290, longitude: 139.7753,
    parkingType: "self_propelled", totalSpaces: 900,
    facilityType: "commercial_facility",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5000, maxWidthMm: 2300, maxHeightMm: 2200, maxWeightKg: 2500, spacesCount: 900 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 500, durationMinutes: 60 },
    ],
    is24h: true,
  },
  {
    name: "ダイバーシティ東京プラザ駐車場",
    slug: "divercity-tokyo-plaza-parking",
    address: "東京都江東区青海1-1-10",
    latitude: 35.6254, longitude: 139.7751,
    parkingType: "self_propelled", totalSpaces: 1307,
    facilityType: "commercial_facility",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5000, maxWidthMm: 1900, maxHeightMm: 2300, maxWeightKg: 2000, spacesCount: 1307 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 500, durationMinutes: 60 },
    ],
    is24h: true,
  },
  {
    name: "デックス東京ビーチ駐車場",
    slug: "decks-tokyo-beach-parking",
    address: "東京都港区台場1-6-1",
    latitude: 35.6291, longitude: 139.7760,
    parkingType: "self_propelled", totalSpaces: 523,
    facilityType: "commercial_facility",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5000, maxWidthMm: 1900, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 523 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60 },
    ],
    is24h: true,
  },
  {
    name: "有明ガーデン駐車場",
    slug: "ariake-garden-parking",
    address: "東京都江東区有明2-1-8",
    latitude: 35.6350, longitude: 139.7920,
    parkingType: "self_propelled", totalSpaces: 1800,
    facilityType: "commercial_facility",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5000, maxWidthMm: 2300, maxHeightMm: 2100, maxWeightKg: 2000, spacesCount: 1800, notes: "入庫後1時間無料" },
    ],
    fees: [
      { feeType: "hourly", amountYen: 800, durationMinutes: 60 },
    ],
    is24h: true,
  },
  {
    name: "東京ビッグサイト東棟地下駐車場",
    slug: "tokyo-big-sight-east-parking",
    address: "東京都江東区有明3-11-1",
    latitude: 35.6315, longitude: 139.7960,
    parkingType: "self_propelled", totalSpaces: 189,
    facilityType: "stadium",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5300, maxWidthMm: 1900, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 189 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 500, durationMinutes: 60, notes: "最大2,000円/日" },
    ],
    is24h: false, openTime: "08:00", closeTime: "22:00",
  },
  {
    name: "東京ビッグサイト南棟立体駐車場",
    slug: "tokyo-big-sight-south-parking",
    address: "東京都江東区有明3-11-24",
    latitude: 35.6295, longitude: 139.7945,
    parkingType: "self_propelled", totalSpaces: 349,
    facilityType: "stadium",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5000, maxWidthMm: 1900, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 349 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 500, durationMinutes: 60, notes: "最大2,000円/日" },
    ],
    is24h: false, openTime: "08:00", closeTime: "22:00",
  },
  {
    name: "北の丸公園第一駐車場（日本武道館）",
    slug: "kitanomaru-park-parking",
    address: "東京都千代田区北の丸公園2",
    latitude: 35.6930, longitude: 139.7500,
    parkingType: "self_propelled", totalSpaces: 143,
    facilityType: "public_facility",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5000, maxWidthMm: 1900, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 143 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 600, durationMinutes: 60, notes: "最大3,000円/日" },
    ],
    is24h: false, openTime: "08:30", closeTime: "22:00",
  },
  {
    name: "明治神宮外苑青山駐車場",
    slug: "meiji-jingu-gaien-aoyama-parking",
    address: "東京都港区北青山2-1",
    latitude: 35.6730, longitude: 139.7200,
    parkingType: "self_propelled", totalSpaces: 132,
    facilityType: "public_facility",
    restrictions: [
      { name: "全車共通", maxLengthMm: 4790, maxWidthMm: 1790, maxHeightMm: 2000, maxWeightKg: 2500, spacesCount: 132 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 540, durationMinutes: 60 },
    ],
    is24h: false, openTime: "06:00", closeTime: "24:00",
  },
  {
    name: "豊洲千客万来パーキング",
    slug: "toyosu-senkyakubanrai-parking",
    address: "東京都江東区豊洲6丁目",
    latitude: 35.6455, longitude: 139.7835,
    parkingType: "self_propelled", totalSpaces: 458,
    facilityType: "commercial_facility",
    restrictions: [
      { name: "全車共通", maxLengthMm: 5000, maxWidthMm: 1900, maxHeightMm: 2100, maxWeightKg: 2500, spacesCount: 458 },
    ],
    fees: [
      { feeType: "hourly", amountYen: 900, durationMinutes: 60, notes: "千客万来2,000円利用で2h無料" },
    ],
    is24h: true,
  },
];

// ============================================================
// Seed 実行
// ============================================================
async function seed() {
  console.log("--- Seed開始 ---");

  // 全テーブル削除 (外部キー依存順)
  console.log("既存データを削除中...");
  await db.run(sql`PRAGMA foreign_keys = OFF`);
  await db.run(sql`DELETE FROM operating_hours`);
  await db.run(sql`DELETE FROM parking_fees`);
  await db.run(sql`DELETE FROM vehicle_restrictions`);
  await db.run(sql`DELETE FROM parking_lots`);
  await db.run(sql`DELETE FROM dimensions`);
  await db.run(sql`DELETE FROM trims`);
  await db.run(sql`DELETE FROM phases`);
  await db.run(sql`DELETE FROM generations`);
  await db.run(sql`DELETE FROM models`);
  await db.run(sql`DELETE FROM makers`);
  await db.run(sql`PRAGMA foreign_keys = ON`);
  console.log("削除完了");

  // ----------------------------------------------------------
  // 車種データ投入
  // ----------------------------------------------------------
  console.log("車種データを投入中...");

  // メーカーの重複排除
  const uniqueMakers = new Map<string, { name: string; slug: string; country: string }>();
  for (const car of carData) {
    if (!uniqueMakers.has(car.makerSlug)) {
      uniqueMakers.set(car.makerSlug, {
        name: car.makerName,
        slug: car.makerSlug,
        country: car.country,
      });
    }
  }

  // メーカー投入
  const makerIdMap = new Map<string, number>();
  let displayOrder = 1;
  for (const [slug, maker] of uniqueMakers) {
    const result = await db
      .insert(makers)
      .values({
        name: maker.name,
        slug: maker.slug,
        country: maker.country,
        display_order: displayOrder++,
      })
      .returning({ id: makers.id })
      .get();
    makerIdMap.set(slug, result.id);
    console.log(`  メーカー: ${maker.name} (id=${result.id})`);
  }

  // 各車種を投入
  const modelIdMap = new Map<string, number>();          // modelSlug → model.id
  const generationIdMap = new Map<string, number>();     // modelSlug:generationName → generation.id
  const phaseIdMap = new Map<string, number>();           // modelSlug:generationName → phase.id (現行型)

  for (const car of carData) {
    const makerId = makerIdMap.get(car.makerSlug)!;

    // model: 同一modelSlugが既に存在する場合はスキップ
    let modelId: number;
    if (modelIdMap.has(car.modelSlug)) {
      modelId = modelIdMap.get(car.modelSlug)!;
    } else {
      const model = await db
        .insert(models)
        .values({
          maker_id: makerId,
          name: car.modelName,
          slug: car.modelSlug,
          body_type: car.bodyType,
          is_popular: true,
        })
        .returning({ id: models.id })
        .get();
      modelId = model.id;
      modelIdMap.set(car.modelSlug, modelId);
    }

    // generation: 同一model+generationNameが既に存在する場合はスキップ
    const genKey = `${car.modelSlug}:${car.generationName}`;
    let generationId: number;
    let phaseId: number;
    if (generationIdMap.has(genKey)) {
      generationId = generationIdMap.get(genKey)!;
      phaseId = phaseIdMap.get(genKey)!;
    } else {
      const generation = await db
        .insert(generations)
        .values({
          model_id: modelId,
          name: car.generationName,
          start_year: car.startYear,
          end_year: car.endYear,
        })
        .returning({ id: generations.id })
        .get();
      generationId = generation.id;
      generationIdMap.set(genKey, generationId);

      const phaseName = car.endYear ? "前期型" : "現行型";
      const phase = await db
        .insert(phases)
        .values({
          generation_id: generationId,
          name: phaseName,
        })
        .returning({ id: phases.id })
        .get();
      phaseId = phase.id;
      phaseIdMap.set(genKey, phaseId);
    }

    // trim
    const trim = await db
      .insert(trims)
      .values({
        phase_id: phaseId,
        name: car.trimName,
        drive_type: car.driveType,
        transmission: car.transmission,
      })
      .returning({ id: trims.id })
      .get();

    // dimension
    await db.insert(dimensions)
      .values({
        trim_id: trim.id,
        length_mm: car.lengthMm,
        width_mm: car.widthMm,
        height_mm: car.heightMm,
        weight_kg: car.weightKg,
        min_turning_radius_m: car.minTurningRadiusM,
      })
      .run();

    console.log(`  車種: ${car.makerName} ${car.modelName} ${car.generationName} (${car.trimName})`);
  }

  const uniqueModels = new Set(carData.map(c => c.modelSlug)).size;
  console.log(`車種データ投入完了: ${uniqueModels}モデル, ${carData.length}グレード`);

  // ----------------------------------------------------------
  // 駐車場データ投入
  // ----------------------------------------------------------
  console.log("駐車場データを投入中...");

  for (const parking of parkingData) {
    // parking_lot
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
        facility_type: parking.facilityType,
      })
      .returning({ id: parkingLots.id })
      .get();

    // vehicle_restrictions
    for (const r of parking.restrictions) {
      await db.insert(vehicleRestrictions)
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
      await db.insert(parkingFees)
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
      await db.insert(operatingHours)
        .values({
          parking_lot_id: lot.id,
          day_of_week: day,
          is_24h: parking.is24h,
          open_time: parking.is24h ? undefined : parking.openTime,
          close_time: parking.is24h ? undefined : parking.closeTime,
        })
        .run();
    }

    console.log(`  駐車場: ${parking.name} (${parking.restrictions.length}制限, ${parking.fees.length}料金)`);
  }

  console.log(`駐車場データ投入完了: ${parkingData.length}件`);
  console.log("--- Seed完了 ---");
}

// 実行
try {
  seed();
} catch (error) {
  console.error("Seedエラー:", error);
  process.exit(1);
}
