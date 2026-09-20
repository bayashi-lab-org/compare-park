import type { MetadataRoute } from "next";
import { eq, and, like, sql } from "drizzle-orm";
import { carParkingCondition } from "@/lib/queries";
import { db } from "@/db";
import {
  models,
  parkingLots,
  makers,
  generations,
  phases,
  trims,
  dimensions,
  vehicleRestrictions,
} from "@/db/schema";
import { TOKYO_WARD_MAP, SIZE_CATEGORIES } from "@/lib/constants";
import { getArticles, ARTICLE_CATEGORIES } from "@/lib/articles";

const BASE_URL = "https://www.tomepita.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // 静的ページ
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/car`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/area`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/articles`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/privacy`, lastModified: "2025-01-01", changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/terms`, lastModified: "2025-01-01", changeFrequency: "yearly", priority: 0.2 },
  ];

  // エリアページ
  const wardPages: MetadataRoute.Sitemap = TOKYO_WARD_MAP.map((w) => ({
    url: `${BASE_URL}/area/${w.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // メーカーページ
  const allMakers = await db.select({ slug: makers.slug }).from(makers);
  const makerPages: MetadataRoute.Sitemap = allMakers.map((m) => ({
    url: `${BASE_URL}/maker/${m.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // サイズ条件ページ
  const sizePages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/parking/size`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    ...SIZE_CATEGORIES.map((cat) => ({
      url: `${BASE_URL}/parking/size/${cat.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];

  // 車種ページ
  const allModels = await db.select({ slug: models.slug }).from(models);
  const carPages: MetadataRoute.Sitemap = allModels.map((m) => ({
    url: `${BASE_URL}/car/${m.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // 駐車場ページ
  const allLots = await db.select({ slug: parkingLots.slug, updatedAt: parkingLots.updated_at }).from(parkingLots).where(carParkingCondition);
  const parkingPages: MetadataRoute.Sitemap = allLots.map((l) => ({
    url: `${BASE_URL}/parking/${l.slug}`,
    lastModified: new Date(l.updatedAt.includes("T") ? l.updatedAt : `${l.updatedAt.replace(" ", "T")}Z`),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // エリア × 車種ページ: データが十分あるページのみサイトマップに登録
  // 判定条件は page.tsx の hasContent と揃える:
  //   restrictions.length >= 10 AND dimension !== null
  //
  // 1) dimension を持つ model slug 一覧（1クエリ）
  const modelsWithDim = await db
    .selectDistinct({ slug: models.slug })
    .from(models)
    .innerJoin(generations, eq(generations.model_id, models.id))
    .innerJoin(phases, eq(phases.generation_id, generations.id))
    .innerJoin(trims, eq(trims.phase_id, phases.id))
    .innerJoin(dimensions, eq(dimensions.trim_id, trims.id));

  // 2) 各wardのrestriction件数を集計（COUNT 23本）
  const wardCounts = await Promise.all(
    TOKYO_WARD_MAP.map(async (w) => {
      const [row] = await db
        .select({ cnt: sql<number>`count(*)` })
        .from(vehicleRestrictions)
        .innerJoin(
          parkingLots,
          eq(vehicleRestrictions.parking_lot_id, parkingLots.id),
        )
        .where(and(like(parkingLots.address, `%${w.name}%`), carParkingCondition));
      return { ward: w, count: Number(row?.cnt ?? 0) };
    }),
  );
  const eligibleWards = wardCounts.filter((w) => w.count >= 10);

  // 3) 直積でサイトマップ生成（hasContent=true のページのみ）
  const areaCar: MetadataRoute.Sitemap = eligibleWards.flatMap((ew) =>
    modelsWithDim.map((m) => ({
      url: `${BASE_URL}/area/${ew.ward.slug}/car/${m.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  );

  // コラム記事 + カテゴリページ
  const categoryPages: MetadataRoute.Sitemap = Object.keys(ARTICLE_CATEGORIES).map((cat) => ({
    url: `${BASE_URL}/articles/category/${cat}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const articles = getArticles();
  const articlePages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${BASE_URL}/articles/${article.slug}`,
    lastModified: article.frontmatter.updatedAt
      ? new Date(article.frontmatter.updatedAt)
      : new Date(article.frontmatter.date),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    ...staticPages,
    ...wardPages,
    ...makerPages,
    ...sizePages,
    ...carPages,
    ...parkingPages,
    ...areaCar,
    ...categoryPages,
    ...articlePages,
  ];
}
