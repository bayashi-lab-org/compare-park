import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
import { ParkingCard } from "@/components/parking-card";
import { ParkingMapLoader } from "@/components/parking-map-loader";
import { MyCarWardBanner } from "@/components/my-car-ward-banner";
import { NearMeButton } from "@/components/near-me-button";
import { VehicleComboboxNav } from "@/components/vehicle-combobox-nav";
import { SizeFilter } from "@/components/size-filter";
import { JsonLd } from "@/components/json-ld";
import {
  getParkingLotsByWard,
  getParkingLotsByWardAndSize,
  getRestrictionsByWard,
  getModelsForSearch,
} from "@/lib/queries";
import { TOKYO_WARD_MAP, getWardBySlug } from "@/lib/constants";

interface Props {
  params: Promise<{ ward: string }>;
  searchParams: Promise<{ minHeight?: string; minWidth?: string; minLength?: string }>;
}

export function generateStaticParams() {
  return TOKYO_WARD_MAP.map((w) => ({ ward: w.slug }));
}

export const revalidate = 86400; // 24h

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ward } = await params;
  const wardInfo = getWardBySlug(ward);
  if (!wardInfo) return {};

  const title = `${wardInfo.name}の駐車場一覧 | トメピタ`;
  const description = `${wardInfo.name}エリアの機械式・立体駐車場を一覧表示。制限寸法や車種適合も確認できます。`;

  return {
    title,
    description,
    alternates: { canonical: `/area/${wardInfo.slug}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `https://www.tomepita.com/area/${wardInfo.slug}`,
      siteName: "トメピタ",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function WardPage({ params, searchParams }: Props) {
  const { ward } = await params;
  const { minHeight, minWidth, minLength } = await searchParams;
  const wardInfo = getWardBySlug(ward);

  if (!wardInfo) {
    notFound();
  }
  const decodedWard = wardInfo.name;

  // サイズフィルタの適用（最初に見つかった条件を適用）
  const sizeFilter = minHeight
    ? { dimension: "height" as const, threshold: Number(minHeight) }
    : minWidth
      ? { dimension: "width" as const, threshold: Number(minWidth) }
      : minLength
        ? { dimension: "length" as const, threshold: Number(minLength) }
        : null;

  const hasSizeFilter = sizeFilter && !isNaN(sizeFilter.threshold);

  let lotsWithRestrictions: Array<{
    lot: {
      id: number;
      name: string;
      slug: string;
      address: string | null;
      latitude: number | null;
      longitude: number | null;
      parking_type: string | null;
    };
    restriction: {
      max_length_mm: number | null;
      max_width_mm: number | null;
      max_height_mm: number | null;
      max_weight_kg: number | null;
    } | null;
  }>;

  const vehiclesForSearch = await getModelsForSearch();

  if (hasSizeFilter) {
    const filteredLots = await getParkingLotsByWardAndSize(
      decodedWard,
      sizeFilter.dimension,
      sizeFilter.threshold
    );
    lotsWithRestrictions = filteredLots.map((lot) => ({
      lot: {
        id: lot.id,
        name: lot.name,
        slug: lot.slug,
        address: lot.address,
        latitude: lot.latitude,
        longitude: lot.longitude,
        parking_type: lot.parking_type,
      },
      restriction: {
        max_length_mm: lot.max_length_mm,
        max_width_mm: lot.max_width_mm,
        max_height_mm: lot.max_height_mm,
        max_weight_kg: lot.max_weight_kg,
      },
    }));
  } else {
    const [lots, wardRestrictions] = await Promise.all([
      getParkingLotsByWard(decodedWard),
      getRestrictionsByWard(decodedWard),
    ]);
    // 駐車場ごとの代表制限（最初の1件）をマップ化
    const restrictionByLot = new Map<number, (typeof wardRestrictions)[number]>();
    for (const r of wardRestrictions) {
      if (!restrictionByLot.has(r.parking_lot_id)) {
        restrictionByLot.set(r.parking_lot_id, r);
      }
    }
    lotsWithRestrictions = lots.map((lot) => ({
      lot: {
        id: lot.id,
        name: lot.name,
        slug: lot.slug,
        address: lot.address,
        latitude: lot.latitude,
        longitude: lot.longitude,
        parking_type: lot.parking_type,
      },
      restriction: restrictionByLot.get(lot.id) ?? null,
    }));
  }

  // マップ用データ整形
  const mapItems = lotsWithRestrictions.map(({ lot }) => ({
    parkingLotName: lot.name,
    parkingLotSlug: lot.slug,
    latitude: lot.latitude,
    longitude: lot.longitude,
    address: lot.address,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${decodedWard}の駐車場一覧 | トメピタ`,
          description: `${decodedWard}エリアの機械式・立体駐車場を一覧表示。制限寸法や車種適合も確認できます。`,
          url: `https://www.tomepita.com/area/${ward}`,
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: lotsWithRestrictions.length,
            itemListElement: lotsWithRestrictions.slice(0, 50).map(({ lot }, index) => ({
              "@type": "ListItem",
              position: index + 1,
              url: `https://www.tomepita.com/parking/${lot.slug}`,
              name: lot.name,
            })),
          },
        }}
      />
      <Breadcrumb
        items={[
          { label: "トップ", href: "/" },
          { label: "エリアから探す", href: "/area" },
          { label: decodedWard },
        ]}
        currentPath={`/area/${ward}`}
      />

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{decodedWard}の駐車場</h1>
          <p className="text-muted-foreground">
            {decodedWard}エリアの駐車場一覧 ({lotsWithRestrictions.length}件)
          </p>
        </div>
        <NearMeButton className="w-full sm:w-auto" />
      </div>

      {/* サイズフィルタ */}
      <div className="mb-4">
        <SizeFilter
          currentMinHeight={minHeight}
          currentMinWidth={minWidth}
          currentMinLength={minLength}
        />
      </div>

      <MyCarWardBanner
        wardSlug={ward}
        wardName={decodedWard}
        className="mb-8"
      />

      {/* 車種選択で適合確認 */}
      <div className="mb-8 rounded-lg border bg-muted/30 p-4">
        <h2 className="mb-3 text-sm font-semibold">
          車種を選んで適合を確認
        </h2>
        <VehicleComboboxNav
          vehicles={vehiclesForSearch}
          basePath={`/area/${ward}/car`}
        />
      </div>

      {/* マップ表示 */}
      {mapItems.length > 0 && (
        <div className="mb-10">
          <h2 className="mb-4 text-xl font-bold">{decodedWard}の駐車場マップ</h2>
          <ParkingMapLoader
            items={mapItems}
            center={wardInfo.lat && wardInfo.lng ? [wardInfo.lat, wardInfo.lng] : undefined}
          />
        </div>
      )}

      {lotsWithRestrictions.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lotsWithRestrictions.map(({ lot, restriction }) => (
            <ParkingCard
              key={lot.id}
              id={`parking-${lot.slug}`}
              slug={lot.slug}
              name={lot.name}
              address={lot.address}
              parkingType={lot.parking_type}
              maxLengthMm={restriction?.max_length_mm}
              maxWidthMm={restriction?.max_width_mm}
              maxHeightMm={restriction?.max_height_mm}
              maxWeightKg={restriction?.max_weight_kg}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/30 py-12 text-center">
          <p className="text-muted-foreground">
            {decodedWard}の駐車場データはまだ登録されていません。
          </p>
        </div>
      )}
    </div>
  );
}
