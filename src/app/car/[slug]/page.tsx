import { VehicleSpecificationNote } from "@/components/vehicle-specification-note";
import {
  resolveVehicleGrade,
  vehicleHref,
  gradeLabel,
} from "@/lib/vehicle-selection";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/breadcrumb";
import { ParkingMatchList } from "@/components/parking-match-list";
import { TrimSelector } from "@/components/trim-selector";
import { MyCarToggle } from "@/components/my-car-toggle";
import { DimensionVisualizer } from "@/components/dimension-visualizer";
import { AreaSearchMini } from "@/components/area-search-mini";
import { JsonLd } from "@/components/json-ld";
import {
  getModelBySlug,
  getLatestGenerationYear,
  getDimensionsByModelId,
  getAllTrimsWithDimensions,
  getAllRestrictions,
  getModelsWithMaker,
  getRelatedModelsByMaker,
} from "@/lib/queries";
import { getArticlesByCarSlug } from "@/lib/articles";
import { buildParkingMatchItems } from "@/lib/matching";
import { TOKYO_WARD_MAP } from "@/lib/constants";

const bodyTypeLabels: Record<string, string> = {
  sedan: "セダン",
  suv: "SUV",
  minivan: "ミニバン",
  compact: "コンパクト",
  wagon: "ワゴン",
  coupe: "クーペ",
  truck: "トラック",
};

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ gen?: string; trim?: string }>;
}

export async function generateStaticParams() {
  const allModels = await getModelsWithMaker();
  return allModels.map((m) => ({ slug: m.slug }));
}

export const revalidate = 604800; // 7d

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const model = await getModelBySlug(slug);
  if (!model) return { title: "車種が見つかりません" };

  const [year, dim] = await Promise.all([
    getLatestGenerationYear(model.id),
    getDimensionsByModelId(model.id),
  ]);
  const yearPrefix = year ? `【${year}年】` : "";
  const title = `${yearPrefix}${model.name} (${model.maker_name}) の寸法と駐車場適合 | トメピタ`;
  const dimText = dim
    ? `全長${dim.length_mm?.toLocaleString() ?? "-"}mm・全幅${dim.width_mm?.toLocaleString() ?? "-"}mm・全高${dim.height_mm?.toLocaleString() ?? "-"}mm・重量${dim.weight_kg?.toLocaleString() ?? "-"}kg。`
    : "全長・全幅・全高・重量を一覧表示。";
  const description = `${model.maker_name} ${model.name}${year ? `（${year}年モデル）` : ""}の${dimText}機械式・立体駐車場に入るかサイズ判定できます。`;

  return {
    title,
    description,
    alternates: { canonical: `/car/${slug}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `https://www.tomepita.com/car/${slug}`,
      siteName: "トメピタ",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function CarDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { gen, trim: trimParam } = await searchParams;
  const model = await getModelBySlug(slug);
  if (!model) notFound();

  const [allTrims, restrictions, relatedModels] = await Promise.all([
    getAllTrimsWithDimensions(model.id),
    getAllRestrictions(),
    getRelatedModelsByMaker(model.maker_id, model.id),
  ]);

  const relatedArticles = getArticlesByCarSlug(slug);

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

  // TrimSelector 用のデータを整形（phaseをまたいだフラットなリスト）
  const trimSelectorData = allTrims.map((t) => ({
    generationId: t.generationId,
    generationName: t.generationName,
    phaseName: t.phaseName,
    startYear: t.startYear,
    endYear: t.endYear,
    trimId: t.trimId,
    trimName: t.trimName,
    driveType: t.driveType,
    transmission: t.transmission,
    dimensionId: t.dimensionId,
    lengthMm: t.lengthMm,
    widthMm: t.widthMm,
    heightMm: t.heightMm,
    weightKg: t.weightKg,
  }));

  // 各駐車場制限とのマッチング判定（共通パイプライン）
  const { items: parkingMatchItems } = buildParkingMatchItems(
    dimension,
    restrictions,
  );

  // FAQ構造化データ生成
  const okCount = parkingMatchItems.filter((r) => r.result === "ok").length;
  const faqItems: { question: string; answer: string }[] = [];

  if (dimension) {
    // Q1: 機械式・立体駐車場に入るか
    const hasOk = okCount > 0;
    faqItems.push({
      question: `${model.name}は機械式駐車場・立体駐車場に入りますか？`,
      answer: hasOk
        ? `${model.name}は全幅${dimension.width_mm?.toLocaleString() ?? "-"}mm、全高${dimension.height_mm?.toLocaleString() ?? "-"}mmです。登録済みの機械式・立体駐車場のうち${okCount}件でOK判定となっています。`
        : `${model.name}は全幅${dimension.width_mm?.toLocaleString() ?? "-"}mm、全高${dimension.height_mm?.toLocaleString() ?? "-"}mmです。現在登録済みの機械式・立体駐車場ではサイズ制限を超える場合があります。詳しくは各駐車場の制限値をご確認ください。`,
    });

    // Q2: 寸法
    faqItems.push({
      question: `${model.name}の全幅・全高はいくつですか？`,
      answer: `${model.name}の寸法は全長${dimension.length_mm?.toLocaleString() ?? "-"}mm、全幅${dimension.width_mm?.toLocaleString() ?? "-"}mm、全高${dimension.height_mm?.toLocaleString() ?? "-"}mm、重量${dimension.weight_kg?.toLocaleString() ?? "-"}kgです。`,
    });

    // Q3: 停められる駐車場
    faqItems.push({
      question: `${model.name}が停められる機械式・立体駐車場はどこですか？`,
      answer: hasOk
        ? `トメピタに登録されている機械式・立体駐車場のうち${okCount}件で${model.name}が停められます。詳しくはこのページの駐車場適合判定をご確認ください。`
        : `現在登録済みの機械式・立体駐車場では制限を超える場合があります。ハイルーフ対応や大型車対応の駐車場をお探しください。`,
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Car",
          name: model.name,
          manufacturer: { "@type": "Organization", name: model.maker_name },
          bodyType: bodyTypeLabels[model.body_type] ?? model.body_type,
          url: `https://www.tomepita.com/car/${slug}`,
          ...(dimension
            ? {
                vehicleSpecialUsage: "駐車場適合判定",
                additionalProperty: [
                  dimension.length_mm != null
                    ? {
                        "@type": "PropertyValue",
                        name: "全長",
                        value: dimension.length_mm,
                        unitCode: "MMT",
                      }
                    : null,
                  dimension.width_mm != null
                    ? {
                        "@type": "PropertyValue",
                        name: "全幅",
                        value: dimension.width_mm,
                        unitCode: "MMT",
                      }
                    : null,
                  dimension.height_mm != null
                    ? {
                        "@type": "PropertyValue",
                        name: "全高",
                        value: dimension.height_mm,
                        unitCode: "MMT",
                      }
                    : null,
                  dimension.weight_kg != null
                    ? {
                        "@type": "PropertyValue",
                        name: "重量",
                        value: dimension.weight_kg,
                        unitCode: "KGM",
                      }
                    : null,
                ].filter(Boolean),
              }
            : {}),
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
          { label: "車種一覧", href: "/car" },
          { label: model.maker_name, href: `/maker/${model.maker_slug}` },
          { label: model.name },
        ]}
        currentPath={`/car/${model.slug}`}
      />

      {/* 車種基本情報 */}
      <div className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">
                {model.name}の寸法と駐車場適合
              </h1>
              <Badge variant="outline">
                {bodyTypeLabels[model.body_type] ?? model.body_type}
              </Badge>
            </div>
            <div className="mt-1 flex items-center gap-4 text-muted-foreground">
              <span>{model.maker_name}</span>
              {model.updated_at && (
                <span className="flex items-center gap-1 text-xs">
                  <CalendarDays className="size-3" />
                  <time dateTime={model.updated_at}>
                    {new Date(model.updated_at).toLocaleDateString("ja-JP")}
                  </time>
                  更新
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0">
            <MyCarToggle
              generationId={selectedTrim?.generationId}
              trimId={selectedTrim?.trimId}
              gradeName={selectedTrim ? gradeLabel(selectedTrim) : undefined}
              slug={model.slug}
              name={model.name}
              makerName={model.maker_name}
              lengthMm={dimension?.length_mm ?? undefined}
              widthMm={dimension?.width_mm ?? undefined}
              heightMm={dimension?.height_mm ?? undefined}
              weightKg={dimension?.weight_kg ?? undefined}
            />
          </div>
        </div>
      </div>

      {/* 世代・グレード選択 */}
      {allTrims.length > 0 && (
        <TrimSelector
          trims={trimSelectorData}
          selectedGenerationId={selectedTrim?.generationId ?? null}
          selectedTrimId={selectedTrim?.trimId ?? null}
          carSlug={slug}
        />
      )}

      {dimension && selectedTrim && (
        <div className="mb-8 rounded-2xl border bg-white p-5 sm:p-6">
          <p className="text-xs font-bold text-primary">
            {trimParam
              ? "このグレードで比較しています"
              : "代表グレードを表示中 · お乗りのグレードを確認してください"}
          </p>
          <p className="mt-2 text-sm leading-6">{gradeLabel(selectedTrim)}</p>
          <VehicleSpecificationNote grade={selectedTrim} />
          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "全長", value: dimension.length_mm, unit: "mm" },
              { label: "全幅", value: dimension.width_mm, unit: "mm" },
              { label: "全高", value: dimension.height_mm, unit: "mm" },
              { label: "重量", value: dimension.weight_kg, unit: "kg" },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-xs text-muted-foreground">{item.label}</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums">
                  {item.value?.toLocaleString() ?? "未確認"}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    {item.value == null ? "" : item.unit}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
          <details className="mt-5 border-t pt-4">
            <summary className="cursor-pointer text-sm font-bold text-primary">
              駐車場の制限値と比べる
            </summary>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              比較用の制限値の例です。「普通車用」「ミドルルーフ」「ハイルーフ」の上限は設備・区画によって異なります。利用する駐車場の数値で確認してください。
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {dimension.height_mm != null && (
                <DimensionVisualizer
                  label="全高 (高さ)"
                  value={dimension.height_mm}
                  limits={[1550, 1750, 1800, 2000]}
                />
              )}
              {dimension.width_mm != null && (
                <DimensionVisualizer
                  label="全幅 (車幅)"
                  value={dimension.width_mm}
                  limits={[1850, 1900, 1950, 2050]}
                />
              )}
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              高さ・幅それぞれの比較で、入庫の可否を保証するものではありません。全長・重量・ミラー・タイヤ幅などの条件も確認が必要です。「上限に近い」は制限値の95%を超える場合の表示です。
            </p>
          </details>
        </div>
      )}

      {!dimension && (
        <Card className="mb-10">
          <CardContent className="py-8 text-center text-muted-foreground">
            指定のグレードの寸法を確認できません。車種一覧から選び直してください。
          </CardContent>
        </Card>
      )}

      {/* エリア検索ミニフォーム */}
      <div className="mb-10 rounded-lg border bg-muted/30 p-4">
        <h3 className="mb-3 text-sm font-semibold">この車で駐車場を探す</h3>
        <AreaSearchMini carSlug={slug} selection={vehicleSelection} />
      </div>

      {/* 停められる駐車場一覧 */}
      <section id="parking-results" className="scroll-mt-24">
        <h2 className="mb-2 text-2xl font-bold">この車の駐車場候補</h2>
        <p className="mb-6 text-sm leading-7 text-muted-foreground">
          選択したグレードと施設の制限を比較しています。空車情報ではありません。
        </p>
        {parkingMatchItems.length > 0 ? (
          <ParkingMatchList
            selection={vehicleSelection}
            items={parkingMatchItems}
            showAreaFilter
          />
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {dimension
                ? "駐車場データがまだ登録されていません。"
                : "寸法データがないため判定できません。"}
            </CardContent>
          </Card>
        )}
      </section>

      {/* エリア別に見る */}
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-bold">
          エリア別に{model.name}の適合を見る
        </h2>
        <div className="flex flex-wrap gap-2">
          {TOKYO_WARD_MAP.map((w) => (
            <Link
              key={w.slug}
              href={vehicleHref(
                `/area/${w.slug}/car/${slug}`,
                vehicleSelection,
              )}
              className="rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
            >
              {w.name}
            </Link>
          ))}
        </div>
      </section>

      {/* 関連コラム記事 */}
      {relatedArticles.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold">{model.name}の関連コラム</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relatedArticles.map((article) => (
              <Link
                key={article.slug}
                href={`/articles/${article.slug}`}
                className="group rounded-lg border bg-background p-4 transition-colors hover:border-primary/50 hover:bg-muted/50"
              >
                <p className="font-medium group-hover:text-primary">
                  {article.frontmatter.title}
                </p>
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                  {article.frontmatter.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 同メーカーの他車種 */}
      {relatedModels.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold">
            {model.maker_name}の他の車種
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {relatedModels.map((m) => (
              <Link
                key={m.slug}
                href={`/car/${m.slug}`}
                className="rounded-lg border bg-background p-4 transition-colors hover:border-primary/50 hover:bg-muted/50"
              >
                <p className="font-medium">{m.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {bodyTypeLabels[m.body_type] ?? m.body_type}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
