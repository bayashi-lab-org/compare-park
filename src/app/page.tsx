import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Car, Search, CheckCircle, MapPin, Ruler } from "lucide-react";
import { NearMeButton } from "@/components/near-me-button";
import {
  getMakers,
  getPopularModels,
  getModelsForSearch,
  getParkingLotsForSearch,
} from "@/lib/queries";
import { InstantCheckForm } from "@/components/instant-check-form";
import { CarSearchTabs } from "@/components/car-search-tabs";
import { JsonLd } from "@/components/json-ld";
import { db } from "@/db";
import { carParkingCondition } from "@/lib/queries";
import { models, makers, dimensions, trims, phases, generations, parkingLots } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { TOKYO_WARD_MAP, FAQ_ITEMS } from "@/lib/constants";

export const revalidate = 86400; // 24h

export const metadata: Metadata = {
  title: "トメピタ | 機械式・立体駐車場に車が入るか即判定 — 車種サイズ×駐車場マッチング",
  alternates: { canonical: "/" },
};

export default async function Home() {
  const [
    makerList,
    popularModels,
    vehiclesForSearch,
    parkingLotsForSearch,
    allModelsWithDims,
    parkingCount,
    modelCount,
  ] = await Promise.all([
    getMakers(),
    getPopularModels(),
    getModelsForSearch(),
    getParkingLotsForSearch(),
    db
      .select({
        id: models.id,
        name: models.name,
        slug: models.slug,
        body_type: models.body_type,
        maker_id: models.maker_id,
        maker_name: makers.name,
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
      .leftJoin(dimensions, eq(dimensions.trim_id, trims.id)),
    db.select({ count: count() }).from(parkingLots).where(carParkingCondition).get(),
    db.select({ count: count() }).from(models).get(),
  ]);

  // 車種ごとに最初の寸法のみ保持（重複排除）
  const modelMap = new Map<
    number,
    {
      id: number;
      name: string;
      slug: string;
      body_type: string;
      maker_id: number;
      maker_name: string;
      length_mm: number | null;
      width_mm: number | null;
      height_mm: number | null;
      weight_kg: number | null;
    }
  >();
  for (const row of allModelsWithDims) {
    if (!modelMap.has(row.id)) {
      modelMap.set(row.id, row);
    }
  }
  const uniqueModels = Array.from(modelMap.values());

  // 人気車種の寸法情報を取得
  const popularWithDims = popularModels.map((pm) => {
    const withDim = uniqueModels.find((m) => m.id === pm.id);
    return {
      ...pm,
      length_mm: withDim?.length_mm ?? null,
      width_mm: withDim?.width_mm ?? null,
      height_mm: withDim?.height_mm ?? null,
      weight_kg: withDim?.weight_kg ?? null,
    };
  });

  return (
    <div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "トメピタ",
          url: "https://www.tomepita.com",
          description:
            "あなたの車がその機械式・立体駐車場に停められるか、寸法データで即判定。東京23区内の駐車場と車種のマッチングサービス。",
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: "https://www.tomepita.com/search?car={search_term_string}",
            },
            "query-input": "required name=search_term_string",
          },
        }}
      />
      {/* セクション1: ヒーロー + 即判定フォーム（統合） */}
      <section className="relative overflow-hidden pb-10 pt-12 sm:pb-12 sm:pt-16 md:pb-16 md:pt-24">
        {/* 背景画像 */}
        <Image
          src="/hero-bg.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-left"
          priority
        />
        {/* オーバーレイ */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/60 to-background/30" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-5xl">
              あなたの車、その駐車場に停められる？
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              車種と駐車場を選ぶだけ。OK・ギリギリ・NGを瞬時に判定します。
            </p>
            <div className="mx-auto mt-4 flex items-center justify-center gap-6 sm:gap-10">
              <div className="text-center">
                <span className="text-2xl font-bold text-primary sm:text-3xl">
                  {parkingCount?.count.toLocaleString()}
                </span>
                <span className="ml-1 text-sm text-muted-foreground">駐車場</span>
              </div>
              <div className="text-center">
                <span className="text-2xl font-bold text-primary sm:text-3xl">
                  {modelCount?.count.toLocaleString()}
                </span>
                <span className="ml-1 text-sm text-muted-foreground">車種</span>
              </div>
            </div>
          </div>
          <div id="check" className="mx-auto mt-6 max-w-4xl rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur-sm sm:mt-8 sm:p-6">
            <InstantCheckForm
              vehicles={vehiclesForSearch}
              parkingLots={parkingLotsForSearch}
            />
          </div>
        </div>
      </section>

      {/* セクション2: 車種を探す（人気車種 + メーカー検索をタブ統合） */}
      <section className="bg-muted/50 py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-6 text-center text-xl font-bold text-foreground sm:mb-8 sm:text-2xl">
            車種を探す
          </h2>
          <CarSearchTabs
            makers={makerList.map((m) => ({
              id: m.id,
              name: m.name,
              slug: m.slug,
            }))}
            models={uniqueModels}
            popularWithDims={popularWithDims}
          />
        </div>
      </section>

      {/* セクション3: エリアから探す（pill型チップ） */}
      <section className="py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-2 flex items-center justify-center gap-2 text-xl font-bold text-foreground sm:text-2xl">
            <MapPin className="size-5 text-muted-foreground" />
            エリアから探す
          </h2>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            東京23区の駐車場を探す
          </p>
          <div className="flex flex-col items-center gap-4">
            <NearMeButton className="w-full max-w-xs" />
            <div className="flex flex-wrap justify-center gap-2">
              {TOKYO_WARD_MAP.map((w) => (
                <Link
                  key={w.slug}
                  href={`/area/${w.slug}`}
                  className="rounded-full bg-muted px-3 py-1.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  {w.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* セクション4: サイズ条件で探す */}
      <section className="py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-2 flex items-center justify-center gap-2 text-xl font-bold text-foreground sm:text-2xl">
            <Ruler className="size-5 text-muted-foreground" />
            サイズ条件で探す
          </h2>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            ハイルーフ対応・大型車対応など、サイズ条件から駐車場を探す
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">全高</h3>
              <div className="flex flex-wrap gap-2">
                <Link href="/parking/size/height-1550" className="rounded-full bg-muted px-3 py-1.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary">普通車対応</Link>
                <Link href="/parking/size/height-1800" className="rounded-full bg-muted px-3 py-1.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary">ハイルーフ対応</Link>
                <Link href="/parking/size/height-2000" className="rounded-full bg-muted px-3 py-1.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary">大型車対応</Link>
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">全幅</h3>
              <div className="flex flex-wrap gap-2">
                <Link href="/parking/size/width-1850" className="rounded-full bg-muted px-3 py-1.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary">1,850mm+</Link>
                <Link href="/parking/size/width-1900" className="rounded-full bg-muted px-3 py-1.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary">1,900mm+</Link>
                <Link href="/parking/size/width-1950" className="rounded-full bg-muted px-3 py-1.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary">1,950mm+</Link>
                <Link href="/parking/size/width-2050" className="rounded-full bg-muted px-3 py-1.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary">2,050mm+</Link>
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">全長</h3>
              <div className="flex flex-wrap gap-2">
                <Link href="/parking/size/length-5000" className="rounded-full bg-muted px-3 py-1.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary">5,000mm+</Link>
                <Link href="/parking/size/length-5300" className="rounded-full bg-muted px-3 py-1.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary">5,300mm+</Link>
              </div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <Link href="/parking/size" className="text-sm font-medium text-primary hover:underline">
              すべてのサイズ条件を見る →
            </Link>
          </div>
        </div>
      </section>

      {/* セクション5: 使い方 */}
      <section className="bg-muted/50 py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-8 text-center text-xl font-bold text-foreground sm:mb-10 sm:text-2xl">
            使い方
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
                <Car className="size-8 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">1. 車種を選ぶ</h3>
              <p className="text-sm text-muted-foreground">
                上の即判定フォームから車種名を入力。メーカー名でも検索できます。
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
                <Search className="size-8 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">2. 駐車場を選ぶ</h3>
              <p className="text-sm text-muted-foreground">
                駐車場名や住所で検索。気になる駐車場を見つけましょう。
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle className="size-8 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">3. 判定を確認</h3>
              <p className="text-sm text-muted-foreground">
                OK・ギリギリ・NGの3段階で、停められるかどうかが一目瞭然。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* セクション6: FAQ */}
      <section className="py-10 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <JsonLd
            data={{
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: FAQ_ITEMS.map((item) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: item.answer,
                },
              })),
            }}
          />
          <h2 className="mb-8 text-center text-xl font-bold text-foreground sm:text-2xl">
            よくある質問
          </h2>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, index) => (
              <details
                key={index}
                className="group rounded-lg border bg-background"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium transition-colors hover:text-primary [&::-webkit-details-marker]:hidden">
                  <span>{item.question}</span>
                  <span className="ml-2 shrink-0 text-muted-foreground transition-transform group-open:rotate-180">
                    ▼
                  </span>
                </summary>
                <div className="border-t px-4 py-3 text-sm leading-relaxed text-muted-foreground">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
