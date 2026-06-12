import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Clock, Phone, ExternalLink, CalendarDays, Car } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/breadcrumb";
import { InlineParkingChecker } from "@/components/inline-parking-checker";
import { VehicleMatchList } from "@/components/vehicle-match-list";
import type { VehicleMatchItem } from "@/components/vehicle-match-list";
import { JsonLd } from "@/components/json-ld";
import {
  getParkingLotBySlug,
  getParkingLots,
  getRestrictionsByParkingLotId,
  getFeesByParkingLotId,
  getOperatingHoursByParkingLotId,
  getAllDimensions,
  getRelatedParkingLotsByWard,
  getPopularModelsWithDimensions,
} from "@/lib/queries";
import { calculateMatch, matchSortOrder, type MatchResult } from "@/lib/matching";
import { getWardSlug } from "@/lib/constants";

const parkingTypeLabels: Record<string, string> = {
  mechanical: "機械式",
  self_propelled: "自走式",
  flat: "平面",
  tower: "タワー式",
};

const feeTypeLabels: Record<string, string> = {
  hourly: "時間料金",
  daily: "日額料金",
  monthly: "月額料金",
};

const dayLabels = ["日", "月", "火", "水", "木", "金", "土"];

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const lots = await getParkingLots();
  return lots.map((l) => ({ slug: l.slug }));
}

export const revalidate = 604800; // 7d

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const lot = await getParkingLotBySlug(slug);
  if (!lot) return { title: "駐車場が見つかりません" };

  const title = `${lot.name} の制限寸法と対応車種 | トメピタ`;
  const description = `${lot.name}(${lot.address ?? ""})の制限寸法を確認。機械式・立体駐車場に入る車種の一覧と適合判定も表示します。`;

  return {
    title,
    description,
    alternates: { canonical: `/parking/${slug}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `https://www.tomepita.com/parking/${slug}`,
      siteName: "トメピタ",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

function extractWard(address: string | null): string | null {
  if (!address) return null;
  const match = address.match(/([\u4e00-\u9fa5]+区)/);
  return match ? match[1] : null;
}

export default async function ParkingDetailPage({ params }: Props) {
  const { slug } = await params;
  const lot = await getParkingLotBySlug(slug);
  if (!lot) notFound();

  const [restrictions, fees, hours, allDims, popularModels] = await Promise.all([
    getRestrictionsByParkingLotId(lot.id),
    getFeesByParkingLotId(lot.id),
    getOperatingHoursByParkingLotId(lot.id),
    getAllDimensions(),
    getPopularModelsWithDimensions(),
  ]);

  // 人気車種のうち、この駐車場に「OK」で停められるものを抽出
  const okPopularModels = popularModels.filter((model) => {
    return restrictions.some((r) => {
      const match = calculateMatch(
        {
          length_mm: model.length_mm,
          width_mm: model.width_mm,
          height_mm: model.height_mm,
          weight_kg: model.weight_kg,
        },
        {
          max_length_mm: r.max_length_mm,
          max_width_mm: r.max_width_mm,
          max_height_mm: r.max_height_mm,
          max_weight_kg: r.max_weight_kg,
        }
      );
      return match.result === "ok";
    });
  });

  const ward = extractWard(lot.address);
  const wardSlug = ward ? getWardSlug(ward) : null;

  const relatedParkingLots = ward
    ? await getRelatedParkingLotsByWard(ward, lot.id)
    : [];

  // 車種ごとに最良の制限でマッチング判定
  const vehicleMap = new Map<
    number,
    {
      model_id: number;
      model_name: string;
      model_slug: string;
      maker_name: string;
      result: MatchResult;
      length_mm: number | null;
      width_mm: number | null;
      height_mm: number | null;
      weight_kg: number | null;
    }
  >();

  // model_idで重複排除しつつ最初の寸法を使う
  const uniqueDims = new Map<number, (typeof allDims)[number]>();
  for (const d of allDims) {
    if (!uniqueDims.has(d.model_id)) {
      uniqueDims.set(d.model_id, d);
    }
  }

  for (const dim of uniqueDims.values()) {
    let bestResult: MatchResult = "ng";

    for (const r of restrictions) {
      const match = calculateMatch(
        {
          length_mm: dim.length_mm,
          width_mm: dim.width_mm,
          height_mm: dim.height_mm,
          weight_kg: dim.weight_kg,
        },
        {
          max_length_mm: r.max_length_mm,
          max_width_mm: r.max_width_mm,
          max_height_mm: r.max_height_mm,
          max_weight_kg: r.max_weight_kg,
        }
      );
      if (matchSortOrder(match.result) < matchSortOrder(bestResult)) {
        bestResult = match.result;
      }
    }

    vehicleMap.set(dim.model_id, {
      model_id: dim.model_id,
      model_name: dim.model_name,
      model_slug: dim.model_slug,
      maker_name: dim.maker_name,
      result: bestResult,
      length_mm: dim.length_mm,
      width_mm: dim.width_mm,
      height_mm: dim.height_mm,
      weight_kg: dim.weight_kg,
    });
  }

  const vehicleResults = Array.from(vehicleMap.values()).sort(
    (a, b) => matchSortOrder(a.result) - matchSortOrder(b.result)
  );

  // VehicleMatchList用のデータ
  const vehicleMatchItems: VehicleMatchItem[] = vehicleResults.map((v) => ({
    modelId: v.model_id,
    modelName: v.model_name,
    modelSlug: v.model_slug,
    makerName: v.maker_name,
    result: v.result,
  }));

  // InlineParkingChecker用の車種データ
  const vehiclesForChecker = Array.from(uniqueDims.values()).map((d) => ({
    slug: d.model_slug,
    name: d.model_name,
    makerName: d.maker_name,
    lengthMm: d.length_mm,
    widthMm: d.width_mm,
    heightMm: d.height_mm,
    weightKg: d.weight_kg,
  }));

  // InlineParkingChecker用の制限データ
  const restrictionsForChecker = restrictions.map((r) => ({
    max_length_mm: r.max_length_mm,
    max_width_mm: r.max_width_mm,
    max_height_mm: r.max_height_mm,
    max_weight_kg: r.max_weight_kg,
  }));

  // 営業時間のJSON-LD用データ
  const openingHoursSpec = hours.map((h) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][h.day_of_week],
    ...(h.is_24h
      ? { opens: "00:00", closes: "23:59" }
      : { opens: h.open_time ?? "00:00", closes: h.close_time ?? "23:59" }),
  }));

  // 料金表示用テキスト
  const priceRangeText = fees.length > 0
    ? fees.map((f) => `${feeTypeLabels[f.fee_type] ?? f.fee_type}: ${f.amount_yen.toLocaleString()}円${f.duration_minutes ? ` / ${f.duration_minutes}分` : ""}`).join("、")
    : null;

  // FAQ構造化データ
  const faqItems: { question: string; answer: string }[] = [];

  if (restrictions.length > 0) {
    const restrictionText = restrictions
      .map((r) => {
        const parts: string[] = [];
        if (r.max_length_mm != null) parts.push(`全長${r.max_length_mm.toLocaleString()}mm`);
        if (r.max_width_mm != null) parts.push(`全幅${r.max_width_mm.toLocaleString()}mm`);
        if (r.max_height_mm != null) parts.push(`全高${r.max_height_mm.toLocaleString()}mm`);
        if (r.max_weight_kg != null) parts.push(`重量${r.max_weight_kg.toLocaleString()}kg`);
        return `${r.restriction_name}: ${parts.join("、")}`;
      })
      .join("。");
    faqItems.push({
      question: `${lot.name}のサイズ制限は？`,
      answer: restrictionText,
    });
  }

  if (hours.length > 0) {
    const hoursText = hours
      .map((h) => `${dayLabels[h.day_of_week]}: ${h.is_24h ? "24時間" : `${h.open_time ?? "-"} - ${h.close_time ?? "-"}`}`)
      .join("、");
    faqItems.push({
      question: `${lot.name}の営業時間は？`,
      answer: hoursText,
    });
  }

  if (fees.length > 0) {
    faqItems.push({
      question: `${lot.name}の料金は？`,
      answer: priceRangeText!,
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ParkingFacility",
          name: lot.name,
          url: `https://www.tomepita.com/parking/${slug}`,
          ...(lot.address ? { address: { "@type": "PostalAddress", streetAddress: lot.address, addressLocality: "東京都", addressCountry: "JP" } } : {}),
          ...(lot.phone ? { telephone: lot.phone } : {}),
          ...(lot.url ? { sameAs: lot.url } : {}),
          ...(lot.total_spaces != null ? { maximumAttendeeCapacity: lot.total_spaces } : {}),
          ...(openingHoursSpec.length > 0 ? { openingHoursSpecification: openingHoursSpec } : {}),
          ...(priceRangeText ? { priceRange: priceRangeText } : {}),
        }}
      />
      {faqItems.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqItems.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
              },
            })),
          }}
        />
      )}
      <Breadcrumb
        items={[
          { label: "トップ", href: "/" },
          ...(ward && wardSlug ? [{ label: ward, href: `/area/${wardSlug}` }] : []),
          { label: lot.name },
        ]}
        currentPath={`/parking/${slug}`}
      />

      {/* 駐車場基本情報 */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">{lot.name}</h1>
          {lot.parking_type && (
            <Badge variant="outline">
              {parkingTypeLabels[lot.parking_type] ?? lot.parking_type}
            </Badge>
          )}
        </div>

        {lot.updated_at && (
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="size-3" />
            <time dateTime={lot.updated_at}>
              {new Date(lot.updated_at).toLocaleDateString("ja-JP")}
            </time>
            更新
          </p>
        )}

        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          {lot.address && (
            <p className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0" />
              {lot.address}
            </p>
          )}
          {lot.phone && (
            <p className="flex items-center gap-2">
              <Phone className="size-4 shrink-0" />
              {lot.phone}
            </p>
          )}
          {lot.url && (
            <p className="flex items-center gap-2">
              <ExternalLink className="size-4 shrink-0" />
              <a
                href={lot.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                公式サイト
              </a>
            </p>
          )}
          {lot.total_spaces != null && (
            <p>総台数: {lot.total_spaces}台</p>
          )}
          {lot.notes && <p>{lot.notes}</p>}
        </div>

        {/* Googleマップ */}
        {(lot.latitude && lot.longitude) || lot.address ? (
          <div className="mt-4 overflow-hidden rounded-lg border">
            <iframe
              title={`${lot.name}の地図`}
              width="100%"
              height="300"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={
                lot.latitude && lot.longitude
                  ? `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${lot.latitude},${lot.longitude}&zoom=16`
                  : `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(lot.address!)}&zoom=16`
              }
            />
          </div>
        ) : null}
      </div>

      {/* 営業時間 */}
      {hours.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="size-5" />
              営業時間
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-1 text-sm">
              {hours.map((h) => (
                <div key={h.id} className="flex gap-4">
                  <span className="w-8 font-medium">
                    {dayLabels[h.day_of_week]}
                  </span>
                  <span>
                    {h.is_24h
                      ? "24時間"
                      : `${h.open_time ?? "-"} - ${h.close_time ?? "-"}`}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 料金情報 */}
      {fees.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">料金</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {fees.map((f) => (
                <div key={f.id} className="flex items-center justify-between">
                  <span>{feeTypeLabels[f.fee_type] ?? f.fee_type}</span>
                  <span className="font-medium">
                    {f.amount_yen.toLocaleString()}円
                    {f.duration_minutes
                      ? ` / ${f.duration_minutes}分`
                      : ""}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 制限値一覧 */}
      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-bold">制限サイズ</h2>
        {restrictions.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {restrictions.map((r) => (
              <Card key={r.id}>
                <CardHeader>
                  <CardTitle className="text-base">{r.restriction_name}</CardTitle>
                  {r.spaces_count != null && (
                    <p className="text-sm text-muted-foreground">{r.spaces_count}台</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {r.max_length_mm != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">全長</span>
                      <span className="font-medium">{r.max_length_mm.toLocaleString()}mm</span>
                    </div>
                  )}
                  {r.max_width_mm != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">全幅</span>
                      <span className="font-medium">{r.max_width_mm.toLocaleString()}mm</span>
                    </div>
                  )}
                  {r.max_height_mm != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">全高</span>
                      <span className="font-medium">{r.max_height_mm.toLocaleString()}mm</span>
                    </div>
                  )}
                  {r.max_weight_kg != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">重量</span>
                      <span className="font-medium">{r.max_weight_kg.toLocaleString()}kg</span>
                    </div>
                  )}
                  {r.monthly_fee_yen != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">月額</span>
                      <span className="font-medium">{r.monthly_fee_yen.toLocaleString()}円</span>
                    </div>
                  )}
                  {r.notes && (
                    <p className="pt-1 text-xs text-muted-foreground">{r.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              制限サイズデータがまだ登録されていません。
            </CardContent>
          </Card>
        )}
      </section>

          {/* この駐車場に停められる人気の車種 */}
          {okPopularModels.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-xl font-bold">{lot.name}に停められる人気の車種</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {okPopularModels.map((m) => (
                  <Link
                    key={m.slug}
                    href={`/car/${m.slug}`}
                    className="group flex items-center gap-3 rounded-xl border bg-background p-3 transition-all hover:border-primary/50 hover:bg-muted/50 hover:shadow-md"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Car className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">{m.maker_name}</p>
                      <p className="truncate text-sm font-bold group-hover:text-primary">{m.name}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* あなたの車は停められる？ */}
          {restrictions.length > 0 && vehiclesForChecker.length > 0 && (
            <section id="checker" className="mb-10 scroll-mt-20">
              <h2 className="mb-4 text-xl font-bold">あなたの車は停められる？</h2>
              <div className="rounded-lg border bg-muted/30 p-4">
                <InlineParkingChecker
                  restrictions={restrictionsForChecker}
                  vehicles={vehiclesForChecker}
                />
              </div>
            </section>
          )}

      {/* 車種との適合判定 */}
      <section>
        <h2 className="mb-6 text-2xl font-bold">車種との適合判定</h2>
        {vehicleMatchItems.length > 0 ? (
          <VehicleMatchList items={vehicleMatchItems} />
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              車種データがまだ登録されていません。
            </CardContent>
          </Card>
        )}
      </section>

      {/* 同エリアの他駐車場 */}
      {ward && relatedParkingLots.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold">{ward}の他の駐車場</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relatedParkingLots.map((p) => (
              <Link
                key={p.slug}
                href={`/parking/${p.slug}`}
                className="rounded-lg border bg-background p-4 transition-colors hover:border-primary/50 hover:bg-muted/50"
              >
                <p className="font-medium">{p.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {parkingTypeLabels[p.parking_type ?? ""] ?? p.parking_type}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
