import { TOKYO_WARDS } from "./constants";

// 二輪・駐輪施設は乗用車の寸法判定の対象外。曖昧な名称も自動公開せず要確認にする。
export const NON_CAR_PARKING_TERMS = ["バイク", "二輪", "駐輪"] as const;

export function isCarParkingName(name: string): boolean {
  return !NON_CAR_PARKING_TERMS.some((term) => name.includes(term));
}

const tokyoAddressPattern = new RegExp(
  `東京都(?:${TOKYO_WARDS.join("|")})[^<>"\\n\\r。]+`
);

/** 案内文の「東京都」ではなく、23区名に続く所在地だけを抽出する。 */
export function extractTokyoParkingAddress(html: string): string | null {
  const addressCell = html.match(
    /<(?:th|dt)\b[^>]*>\s*(?:住所|所在地)\s*<\/(?:th|dt)>\s*<(?:td|dd)\b[^>]*>([\s\S]*?)<\/(?:td|dd)>/i
  );
  const source = addressCell ? addressCell[1].replace(/<[^>]+>/g, "") : html;
  const match = source.match(tokyoAddressPattern);
  if (!match) return null;
  const address = match[0]
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/(?:営業時間|高さ)[\s\S]*/, "")
    .trim();
  return address.length <= 160 && /[0-9０-９]/.test(address) ? address : null;
}

export function hasContaminatedAddress(address: string): boolean {
  return /手帳|発行する|法律に規定|営業時間/.test(address) || address.length > 160;
}
