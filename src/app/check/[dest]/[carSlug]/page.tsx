import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Info, Car, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/breadcrumb";
import { ParkingMatchList } from "@/components/parking-match-list";
import { ParkingMapLoader } from "@/components/parking-map-loader";
import { JsonLd } from "@/components/json-ld";
import { getDestinationBySlug, getAllDestinations } from "@/lib/destinations";
import { getModelBySlug, getDimensionsByModelId, getNearbyParkingLots, getAllRestrictions } from "@/lib/queries";
import { calculateMatch, buildParkingMatchItems } from "@/lib/matching";
import { MatchBadge } from "@/components/match-badge";
import { DimensionCompare } from "@/components/dimension-compare";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ dest: string; carSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { dest, carSlug } = await params;
  const destination = getDestinationBySlug(dest);
  const model = await getModelBySlug(carSlug);
  if (!destination || !model) return {};

  const title = `${destination.name}に${model.name}でいける？駐車場サイズ判定と周辺ガイド | トメピタ`;
  const description = `${destination.name}の公式駐車場に${model.maker_name} ${model.name}が停められるかをサイズ比較で判定。公式がNGな場合の周辺の代替駐車場もマップ付きで紹介します。`;

  return {
    title,
    description,
    alternates: { canonical: `/check/${dest}/${carSlug}` },
  };
}

export default async function DestinationCarCheckPage({ params }: Props) {
  const { dest, carSlug } = await params;
  const destination = getDestinationBySlug(dest);
  const model = await getModelBySlug(carSlug);

  if (!destination || !model) notFound();

  const [dimension, nearbyLots, allRestrictions] = await Promise.all([
    getDimensionsByModelId(model.id),
    getNearbyParkingLots(destination.latitude, destination.longitude, 1.0),
    getAllRestrictions(),
  ]);

  if (!dimension) notFound();

  // 1. 公式駐車場の判定
  const officialMatch = calculateMatch(
    {
      length_mm: dimension.length_mm,
      width_mm: dimension.width_mm,
      height_mm: dimension.height_mm,
      weight_kg: dimension.weight_kg,
    },
    {
      max_length_mm: 5300, // 不明な場合は余裕を持たせるか、データがあればそれを使う
      max_width_mm: destination.max_width_mm,
      max_height_mm: destination.max_height_mm,
      max_weight_kg: 2500,
    }
  );

  // 2. 周辺駐車場の判定
  const nearbyRestrictions = allRestrictions.filter(r => 
    nearbyLots.some(l => l.id === r.parking_lot_id)
  );
  const { items: parkingMatchItems } = buildParkingMatchItems(dimension, nearbyRestrictions);
  const okNearbyCount = parkingMatchItems.filter(i => i.result === "ok").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[
          { label: "トップ", href: "/" },
          { label: "目的地から探す", href: "/check" },
          { label: destination.name, href: `/check/${dest}` },
          { label: model.name },
        ]}
        currentPath={`/check/${dest}/${carSlug}`}
      />

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            {destination.name}に{model.name}でいける？
          </h1>
          <p className="mt-2 text-muted-foreground">
            {model.maker_name} {model.name} のサイズと、{destination.name}周辺の駐車場制限を比較しました。
          </p>
        </div>
        <Badge variant="outline" className="h-fit py-1">
          {model.maker_name}
        </Badge>
      </div>

      {/* 判定サマリー */}
      <Card className="mb-10 overflow-hidden border-2 border-primary/20">
        <div className={cn(
          "flex flex-col items-center justify-center p-8 text-center sm:flex-row sm:gap-8 sm:text-left",
          officialMatch.result === "ok" ? "bg-match-ok/5" : 
          officialMatch.result === "caution" ? "bg-match-caution/5" : "bg-match-ng/5"
        )}>
          <div className="mb-4 sm:mb-0">
            <MatchBadge result={officialMatch.result} className="text-xl px-8 py-3" />
          </div>
          <div>
            <h2 className="text-xl font-bold">
              {officialMatch.result === "ok" ? "公式駐車場にスムーズに停められます" :
               officialMatch.result === "caution" ? "公式駐車場はサイズがギリギリです" :
               "公式駐車場はサイズオーバーの可能性があります"}
            </h2>
            <p className="mt-1 text-muted-foreground">
              {officialMatch.result === "ng" 
                ? `周辺に${okNearbyCount}件の停められる駐車場があります。` 
                : "お出かけ前に詳細な制限値をご確認ください。"}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* 詳細比較 */}
          <section className="mb-12">
            <h2 className="mb-4 text-xl font-bold">公式駐車場とのサイズ比較</h2>
            <Card>
              <CardContent className="space-y-6 pt-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <p className="text-sm font-bold text-muted-foreground">対象駐車場</p>
                    <p className="font-bold">{destination.official_parking_name}</p>
                  </div>
                  <Info className="size-5 text-muted-foreground" />
                </div>
                
                {officialMatch.details.map((d) => (
                  <DimensionCompare
                    key={d.dimension}
                    label={d.label}
                    value={d.value}
                    limit={d.limit}
                    unit={d.dimension === "weight" ? "kg" : "mm"}
                  />
                ))}
              </CardContent>
            </Card>
          </section>

          {/* 周辺の代替駐車場マップ */}
          <section className="mb-12">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">周辺の停められる駐車場</h2>
              <span className="text-sm font-medium text-match-ok">
                <CheckCircle className="inline-block mr-1 size-4" />
                {okNearbyCount}件がOK判定
              </span>
            </div>
            
            <div className="mb-6">
              <ParkingMapLoader
                items={parkingMatchItems}
                center={[destination.latitude, destination.longitude]}
                zoom={15}
              />
            </div>

            <ParkingMatchList items={parkingMatchItems} showSearch={false} />
          </section>
        </div>

        <div className="lg:col-span-1">
          {/* 車種情報 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">車両サイズ: {model.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">全長</span>
                <span className="font-bold">{dimension.length_mm?.toLocaleString()} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">全幅</span>
                <span className="font-bold">{dimension.width_mm?.toLocaleString()} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">全高</span>
                <span className="font-bold">{dimension.height_mm?.toLocaleString()} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">重量</span>
                <span className="font-bold">{dimension.weight_kg == null ? "未確認" : `${dimension.weight_kg.toLocaleString()} kg`}</span>
              </div>
              <div className="pt-4">
                <Link
                  href={`/car/${model.slug}`}
                  className="flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-bold transition-colors hover:bg-muted"
                >
                  <Car className="size-3.5" />
                  車種詳細・他のエリアで探す
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* 他の目的地 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">他の目的地で判定</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {getAllDestinations()
                  .filter(d => d.slug !== dest)
                  .slice(0, 5)
                  .map(d => (
                    <Link
                      key={d.slug}
                      href={`/check/${d.slug}/${carSlug}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {d.name} に {model.name} でいく
                    </Link>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
