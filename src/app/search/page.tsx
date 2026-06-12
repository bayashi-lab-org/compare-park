import type { Metadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
import { MatchBadge } from "@/components/match-badge";
import { DimensionCompare } from "@/components/dimension-compare";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  getModelBySlug,
  getDimensionsByModelId,
  getParkingLotsByWard,
  getAllRestrictions,
  getParkingLots,
  getNearbyParkingLots,
} from "@/lib/queries";
import { calculateMatch, matchSortOrder } from "@/lib/matching";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ car?: string; ward?: string; lat?: string; lng?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const parts: string[] = [];
  if (sp.car) parts.push(sp.car);
  if (sp.lat && sp.lng) parts.push("現在地周辺");
  else if (sp.ward) parts.push(sp.ward);

  return {
    title: `${parts.length > 0 ? parts.join(" x ") + " の" : ""}検索結果 | トメピタ`,
    description: "車種とエリアで絞り込んだ機械式・立体駐車場の適合判定結果を表示します。",
    alternates: { canonical: "/search" },
    robots: { index: false, follow: false },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const carSlug = sp.car;
  const ward = sp.ward;
  const lat = sp.lat ? parseFloat(sp.lat) : null;
  const lng = sp.lng ? parseFloat(sp.lng) : null;

  // 車種情報の取得
  const model = carSlug ? await getModelBySlug(carSlug) : null;
  const dimension =
    model ? await getDimensionsByModelId(model.id) : null;

  // 駐車場の取得
  // 3つのクエリの戻り値から、このページで必要なフィールドだけを共通型として抽出
  type LotRow = Awaited<ReturnType<typeof getNearbyParkingLots>>[number];
  let lots: LotRow[];
  if (lat && lng) {
    lots = await getNearbyParkingLots(lat, lng, 3.0);
  } else if (ward) {
    lots = await getParkingLotsByWard(ward);
  } else {
    lots = await getParkingLots();
  }

  // 全駐車場の制限を一括取得し、駐車場IDごとにグルーピング（N+1回避）
  const allRestrictions = await getAllRestrictions();
  const restrictionsByLot = new Map<number, typeof allRestrictions>();
  for (const r of allRestrictions) {
    const list = restrictionsByLot.get(r.parking_lot_id);
    if (list) {
      list.push(r);
    } else {
      restrictionsByLot.set(r.parking_lot_id, [r]);
    }
  }

  // 各駐車場の制限と判定
  const results = lots.map((lot) => {
    const restrictions = restrictionsByLot.get(lot.id) ?? [];

    if (!dimension || restrictions.length === 0) {
      return { lot, bestMatch: null };
    }

    // 最良のマッチングを選択
    let bestMatch = calculateMatch(
      {
        length_mm: dimension.length_mm,
        width_mm: dimension.width_mm,
        height_mm: dimension.height_mm,
        weight_kg: dimension.weight_kg,
      },
      {
        max_length_mm: restrictions[0].max_length_mm,
        max_width_mm: restrictions[0].max_width_mm,
        max_height_mm: restrictions[0].max_height_mm,
        max_weight_kg: restrictions[0].max_weight_kg,
      }
    );

    for (let i = 1; i < restrictions.length; i++) {
      const match = calculateMatch(
        {
          length_mm: dimension.length_mm,
          width_mm: dimension.width_mm,
          height_mm: dimension.height_mm,
          weight_kg: dimension.weight_kg,
        },
        {
          max_length_mm: restrictions[i].max_length_mm,
          max_width_mm: restrictions[i].max_width_mm,
          max_height_mm: restrictions[i].max_height_mm,
          max_weight_kg: restrictions[i].max_weight_kg,
        }
      );
      if (matchSortOrder(match.result) < matchSortOrder(bestMatch.result)) {
        bestMatch = match;
      }
    }

    return { lot, bestMatch };
  });

  // マッチング結果でソート（結果がある場合）
  if (dimension) {
    results.sort((a, b) => {
      if (!a.bestMatch) return 1;
      if (!b.bestMatch) return -1;
      return matchSortOrder(a.bestMatch.result) - matchSortOrder(b.bestMatch.result);
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[
          { label: "トップ", href: "/" },
          { label: "検索結果" },
        ]}
        currentPath="/search"
      />

      <h1 className="mb-2 text-3xl font-bold">検索結果</h1>

      {/* 検索条件の表示 */}
      <div className="mb-8 flex flex-wrap gap-2 text-sm text-muted-foreground">
        {model && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
            車種: {model.maker_name} {model.name}
          </span>
        )}
        {lat && lng ? (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
            エリア: 現在地周辺
          </span>
        ) : ward && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
            エリア: {ward}
          </span>
        )}
        {!model && !ward && !lat && (
          <span>全駐車場を表示しています</span>
        )}
      </div>

      <p className="mb-6 text-muted-foreground">{results.length}件の駐車場</p>

      {results.length > 0 ? (
        <div className="space-y-4">
          {results.map(({ lot, bestMatch }) => (
            <Card key={lot.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/parking/${lot.slug}`} className="hover:underline">
                    <CardTitle className="text-base">{lot.name}</CardTitle>
                  </Link>
                  {bestMatch && <MatchBadge result={bestMatch.result} />}
                </div>
                {lot.address && (
                  <p className="text-sm text-muted-foreground">{lot.address}</p>
                )}
              </CardHeader>
              {bestMatch && bestMatch.details.length > 0 && (
                <CardContent className="space-y-3">
                  {bestMatch.details.map((d) => (
                    <DimensionCompare
                      key={d.dimension}
                      label={d.label}
                      value={d.value}
                      limit={d.limit}
                      unit={d.dimension === "weight" ? "kg" : "mm"}
                    />
                  ))}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/30 py-12 text-center">
          <p className="text-muted-foreground">
            条件に一致する駐車場が見つかりませんでした。
          </p>
        </div>
      )}
    </div>
  );
}
