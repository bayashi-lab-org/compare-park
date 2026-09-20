import {
  resolveVehicleGrade,
  vehicleHref,
  gradeLabel,
} from "@/lib/vehicle-selection";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { ParkingMatchList } from "@/components/parking-match-list";
import { ParkingMapLoader } from "@/components/parking-map-loader";
import {
  getModelBySlug,
  getAllTrimsWithDimensions,
  getRestrictionsByWard,
  getModelsWithMaker,
  getDimensionsByModelId,
} from "@/lib/queries";
import { buildParkingMatchItems, generateMatchSummary } from "@/lib/matching";
import { TOKYO_WARD_MAP, getWardBySlug } from "@/lib/constants";

interface Props {
  params: Promise<{ ward: string; slug: string }>;
  searchParams: Promise<{ gen?: string; trim?: string }>;
}

export async function generateStaticParams() {
  const allModels = await getModelsWithMaker();
  return TOKYO_WARD_MAP.flatMap((w) =>
    allModels.map((m) => ({ ward: w.slug, slug: m.slug })),
  );
}

export const revalidate = 604800; // 7d

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ward, slug } = await params;
  const wardInfo = getWardBySlug(ward);
  if (!wardInfo) return {};
  const model = await getModelBySlug(slug);
  if (!model) return { title: "車種が見つかりません" };

  const restrictions = await getRestrictionsByWard(wardInfo.name);
  const dimension = await getDimensionsByModelId(model.id);
  // 制限データ10件以上 AND 寸法データありの場合のみインデックス許可
  const hasContent = restrictions.length >= 10 && dimension !== null;

  const title = `${wardInfo.name}で${model.maker_name} ${model.name}が停められる駐車場 | トメピタ`;
  const description = `${wardInfo.name}エリアの機械式・立体駐車場で${model.maker_name} ${model.name}が駐車可能かを判定。全長・全幅・全高・重量と制限寸法を比較し、停められるかを一目で確認できます。`;

  return {
    title,
    description,
    alternates: { canonical: `/area/${wardInfo.slug}/car/${slug}` },
    robots: hasContent
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      type: "website",
      title,
      description,
      url: `https://www.tomepita.com/area/${wardInfo.slug}/car/${slug}`,
      siteName: "トメピタ",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function AreaCarPage({ params, searchParams }: Props) {
  const { ward, slug } = await params;
  const { gen, trim: trimParam } = await searchParams;
  const wardInfo = getWardBySlug(ward);

  if (!wardInfo) {
    notFound();
  }
  const decodedWard = wardInfo.name;

  const model = await getModelBySlug(slug);
  if (!model) notFound();

  const [allTrims, restrictions] = await Promise.all([
    getAllTrimsWithDimensions(model.id),
    getRestrictionsByWard(decodedWard),
  ]);

  const selectedTrim = resolveVehicleGrade(allTrims, {
    generationId: gen !== undefined ? Number(gen) : undefined,
    trimId: trimParam !== undefined ? Number(trimParam) : undefined,
  });
  const vehicleSelection = {
    carSlug: slug,
    generationId: selectedTrim?.generationId,
    trimId: selectedTrim?.trimId,
  };

  const dimension = selectedTrim
    ? {
        length_mm: selectedTrim.lengthMm,
        width_mm: selectedTrim.widthMm,
        height_mm: selectedTrim.heightMm,
        weight_kg: selectedTrim.weightKg,
      }
    : null;

  // マッチング判定（共通パイプライン）
  const { items: parkingMatchItems, matchDetails } = buildParkingMatchItems(
    dimension,
    restrictions,
  );
  const okCount = parkingMatchItems.filter((i) => i.result === "ok").length;

  const summaryLines = generateMatchSummary(
    model.name,
    model.maker_name,
    decodedWard,
    dimension,
    matchDetails,
    parkingMatchItems.length,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: `${decodedWard}で${model.maker_name} ${model.name}が停められる駐車場`,
          url: `https://www.tomepita.com/area/${ward}/car/${slug}`,
          description: `${decodedWard}エリアの機械式・立体駐車場で${model.name}が駐車可能かを判定。`,
          about: [
            {
              "@type": "Car",
              name: model.name,
              manufacturer: { "@type": "Organization", name: model.maker_name },
            },
            {
              "@type": "Place",
              name: decodedWard,
              address: {
                "@type": "PostalAddress",
                addressLocality: decodedWard,
                addressRegion: "東京都",
                addressCountry: "JP",
              },
            },
          ],
          ...(parkingMatchItems.length > 0
            ? {
                mainEntity: {
                  "@type": "ItemList",
                  numberOfItems: parkingMatchItems.length,
                  itemListElement: parkingMatchItems
                    .slice(0, 20)
                    .map((item, i) => ({
                      "@type": "ListItem",
                      position: i + 1,
                      name: item.parkingLotName,
                      url: `https://www.tomepita.com/parking/${item.parkingLotSlug}`,
                    })),
                },
              }
            : {}),
        }}
      />
      <Breadcrumb
        items={[
          { label: "トップ", href: "/" },
          { label: "エリアから探す", href: "/area" },
          { label: decodedWard, href: `/area/${ward}` },
          { label: model.name },
        ]}
        currentPath={`/area/${ward}/car/${slug}`}
      />

      <div className="mb-8">
        <h1 className="text-2xl font-bold sm:text-3xl">
          {decodedWard}で{model.name}が停められる駐車場
        </h1>
        <p className="mt-2 text-muted-foreground">
          {decodedWard}エリアの駐車場 {parkingMatchItems.length}件中、
          <span className="font-medium text-match-ok">
            {okCount}件がサイズ条件内
          </span>
          です。
        </p>
      </div>

      {selectedTrim && (
        <div className="mb-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-xs font-bold text-primary">
            {trimParam ? "選択したグレードで比較" : "代表グレードでの参考判定"}
          </p>
          <p className="mt-1 text-sm">{gradeLabel(selectedTrim)}</p>
          <Link
            className="mt-2 inline-block text-sm font-bold text-primary underline"
            href={vehicleHref(`/car/${slug}`, vehicleSelection)}
          >
            車・グレードを変更する
          </Link>
        </div>
      )}
      {/* 車種情報サマリー */}
      {dimension && (
        <Card className="mb-6">
          <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{model.maker_name}</Badge>
              <Link
                href={vehicleHref(`/car/${slug}`, vehicleSelection)}
                className="font-medium text-primary hover:underline"
              >
                {model.name}の詳細
              </Link>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {dimension.length_mm != null && (
                <span>全長 {dimension.length_mm.toLocaleString()}mm</span>
              )}
              {dimension.width_mm != null && (
                <span>全幅 {dimension.width_mm.toLocaleString()}mm</span>
              )}
              {dimension.height_mm != null && (
                <span>全高 {dimension.height_mm.toLocaleString()}mm</span>
              )}
              {dimension.weight_kg != null && (
                <span>重量 {dimension.weight_kg.toLocaleString()}kg</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!dimension && (
        <Card className="mb-6">
          <CardContent className="py-8 text-center text-muted-foreground">
            この車種の寸法データはまだ登録されていません。
          </CardContent>
        </Card>
      )}

      {/* 判定サマリー */}
      {summaryLines.length > 0 && (
        <div className="mb-8 rounded-lg border bg-muted/30 p-4">
          <h2 className="mb-2 text-base font-semibold">
            {decodedWard}での{model.name}の駐車場適合まとめ
          </h2>
          <div className="space-y-1 text-sm text-foreground/80">
            {summaryLines.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>
      )}

      {/* マップ表示 */}
      {parkingMatchItems.length > 0 && (
        <div className="mb-10">
          <h2 className="mb-4 text-xl font-bold">
            {decodedWard}の駐車場マップ
          </h2>
          <ParkingMapLoader
            selection={vehicleSelection}
            items={parkingMatchItems}
            center={
              wardInfo.lat && wardInfo.lng
                ? [wardInfo.lat, wardInfo.lng]
                : undefined
            }
          />
        </div>
      )}

      {/* 判定リスト */}
      <section>
        <h2 className="mb-4 text-xl font-bold">
          {decodedWard}の駐車場 適合判定
        </h2>
        {parkingMatchItems.length > 0 ? (
          <ParkingMatchList
            selection={vehicleSelection}
            items={parkingMatchItems}
          />
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {dimension
                ? `${decodedWard}の駐車場データはまだ登録されていません。`
                : "寸法データがないため判定できません。"}
            </CardContent>
          </Card>
        )}
      </section>

      {/* 関連リンク */}
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-bold">関連ページ</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href={vehicleHref(`/car/${slug}`, vehicleSelection)}
            className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-muted"
          >
            {model.name}の全エリア判定を見る
          </Link>
          <Link
            href={`/area/${ward}`}
            className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-muted"
          >
            {decodedWard}の駐車場一覧
          </Link>
        </div>
      </section>
    </div>
  );
}
