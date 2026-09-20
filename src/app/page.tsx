import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Car, MapPin, Ruler, BookOpen, Check } from "lucide-react";
import { InstantCheckForm } from "@/components/instant-check-form";
import { JsonLd } from "@/components/json-ld";
import {
  getModelsForSearch,
  getParkingLotsForSearch,
  getPopularModelsWithDimensions,
} from "@/lib/queries";
import { TOKYO_WARD_MAP } from "@/lib/constants";
import { getArticles } from "@/lib/articles";

export const revalidate = 86400;
export const metadata: Metadata = {
  title:
    "トメピタ | 機械式・立体駐車場に車が入るか即判定 — 車種サイズ×駐車場マッチング",
  alternates: { canonical: "/" },
};

export default async function Home() {
  const [vehicles, parkingLots, popular] = await Promise.all([
    getModelsForSearch(),
    getParkingLotsForSearch(),
    getPopularModelsWithDimensions(),
  ]);
  const articles = getArticles().slice(0, 3);
  return (
    <div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "トメピタ",
          url: "https://www.tomepita.com",
          description:
            "車と駐車場の寸法を比較できる東京23区の駐車場検索サービス",
        }}
      />
      <section className="border-b bg-[#eef4f8]">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:py-20">
          <div>
            <p className="mb-4 flex items-center gap-2 text-xs font-bold tracking-wider text-primary">
              <span className="h-px w-6 bg-primary" />
              車のサイズから探す駐車場
            </p>
            <h1 className="text-[32px] leading-[1.45] font-bold tracking-tight text-[#142d45] sm:text-4xl lg:text-5xl">
              その車に合う駐車場を、
              <br className="hidden lg:block" />
              迷わず。
            </h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
              高さや幅の制限が気になるときに。
              <br />
              あなたの車と駐車場のサイズを比べて、
              <br className="hidden sm:block" />
              行く前の「入るかな？」を確認できます。
            </p>
            <div className="mt-7 hidden gap-6 border-t border-slate-300/60 pt-5 text-sm sm:flex">
              <div>
                <strong className="mr-1 text-2xl tabular-nums text-[#142d45]">
                  {parkingLots.length.toLocaleString()}
                </strong>
                駐車場
              </div>
              <div>
                <strong className="mr-1 text-2xl tabular-nums text-[#142d45]">
                  {vehicles.length}
                </strong>
                車種
              </div>
              <div className="self-center text-xs text-muted-foreground">
                東京23区
              </div>
            </div>
          </div>
          <div
            id="check"
            className="min-w-0 scroll-mt-24 rounded-2xl border border-white bg-white p-5 shadow-sm sm:p-7"
          >
            <InstantCheckForm vehicles={vehicles} parkingLots={parkingLots} />
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="py-10 sm:py-14">
          <div className="mb-6 flex items-end justify-between gap-3">
            <div>
              <p className="mb-2 text-xs font-bold tracking-wider text-primary">
                行き先から
              </p>
              <h2 className="text-2xl font-bold">どのエリアへ行きますか？</h2>
            </div>
            <Link
              href="/area"
              className="shrink-0 text-sm font-bold text-primary"
            >
              23区すべて
              <ArrowRight className="ml-1 inline size-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              "shibuya",
              "shinjuku",
              "minato",
              "chiyoda",
              "chuo",
              "shinagawa",
            ].map((slug) => {
              const ward = TOKYO_WARD_MAP.find((ward) => ward.slug === slug);
              return (
                ward && (
                  <Link
                    key={slug}
                    href={`/area/${slug}`}
                    className="group rounded-2xl border bg-white p-5 transition-colors hover:border-primary"
                  >
                    <MapPin className="mb-5 size-5 text-primary" />
                    <span className="font-bold">{ward.name}</span>
                    <ArrowRight className="ml-2 inline size-4 text-muted-foreground group-hover:text-primary" />
                  </Link>
                )
              );
            })}
          </div>
        </section>
        <section className="border-t py-10 sm:py-14">
          <div className="mb-6 flex items-end justify-between gap-3">
            <div>
              <p className="mb-2 text-xs font-bold tracking-wider text-primary">
                あなたの車から
              </p>
              <h2 className="text-2xl font-bold">車種のサイズを確認</h2>
            </div>
            <Link
              href="/car"
              className="shrink-0 text-sm font-bold text-primary"
            >
              車種一覧
              <ArrowRight className="ml-1 inline size-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {popular.slice(0, 6).map((car) => (
              <Link
                key={car.slug}
                href={`/car/${car.slug}`}
                className="group flex gap-3 rounded-2xl border bg-white p-4 transition-colors hover:border-primary sm:p-5"
              >
                <span className="hidden size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-primary sm:flex">
                  <Car className="size-6" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-muted-foreground">
                    {car.maker_name}
                  </span>
                  <span className="mt-1 block font-bold group-hover:text-primary">
                    {car.name}
                  </span>
                  <span className="mt-2 block text-xs text-muted-foreground">
                    世代・グレードを選んで比較
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
        <section className="mb-10 grid gap-6 rounded-2xl bg-[#eaf1f6] p-6 sm:p-8 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <Ruler className="mb-4 size-6 text-primary" />
            <h2 className="text-xl font-bold">何を比べればいい？</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              「幅は入るけど、高さが足りない」を防ぐために、4つの条件を確認します。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {["全長", "全幅", "全高", "重量"].map((label, index) => (
              <div key={label} className="rounded-xl bg-white p-4">
                <p className="flex items-center justify-between font-bold">
                  {label}
                  <Check className="size-4 text-primary" />
                </p>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  {
                    [
                      "車の前から後ろまで",
                      "車体の横幅",
                      "地面から屋根まで",
                      "車両の重さ",
                    ][index]
                  }
                </p>
              </div>
            ))}
          </div>
        </section>
        <section className="border-t py-10 sm:py-14">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">駐車場選びのヒント</h2>
            <Link href="/articles" className="text-sm font-bold text-primary">
              コラム一覧
              <ArrowRight className="ml-1 inline size-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {articles.map((article) => (
              <Link
                key={article.slug}
                href={`/articles/${article.slug}`}
                className="rounded-2xl border bg-white p-5 transition-colors hover:border-primary"
              >
                <BookOpen className="mb-4 size-5 text-primary" />
                <h3 className="font-bold leading-7">
                  {article.frontmatter.title}
                </h3>
                <p className="mt-3 line-clamp-2 text-sm leading-7 text-muted-foreground">
                  {article.frontmatter.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
