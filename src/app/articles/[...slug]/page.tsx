import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import Link from "next/link";
import { ArrowLeft, Calendar, Tag } from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { TableOfContents } from "@/components/table-of-contents";
import { extractHeadings } from "@/lib/extract-headings";
import {
  getArticleBySlug,
  getArticles,
  getArticlesByCategory,
  ARTICLE_CATEGORIES,
} from "@/lib/articles";

const BASE_URL = "https://www.tomepita.com";

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateStaticParams() {
  const articles = getArticles();
  return articles.map((article) => ({
    slug: article.slug.split("/"),
  }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const slugStr = slug.join("/");
  const article = getArticleBySlug(slugStr);

  if (!article) return {};

  return {
    title: article.frontmatter.title,
    description: article.frontmatter.description,
    alternates: {
      canonical: `/articles/${slugStr}`,
    },
    openGraph: {
      type: "article",
      title: article.frontmatter.title,
      description: article.frontmatter.description,
      url: `${BASE_URL}/articles/${slugStr}`,
      publishedTime: article.frontmatter.date,
      modifiedTime: article.frontmatter.updatedAt ?? article.frontmatter.date,
      siteName: "トメピタ",
    },
    twitter: {
      card: "summary_large_image",
      title: article.frontmatter.title,
      description: article.frontmatter.description,
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const slugStr = slug.join("/");
  const article = getArticleBySlug(slugStr);

  if (!article) notFound();

  const categoryLabel =
    ARTICLE_CATEGORIES[article.frontmatter.category] ??
    article.frontmatter.category;

  const relatedArticles = getArticlesByCategory(
    article.frontmatter.category
  ).filter((a) => a.slug !== slugStr);

  const tocItems = extractHeadings(article.content);

  const jsonLdData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.frontmatter.title,
    description: article.frontmatter.description,
    image: `${BASE_URL}/opengraph-image`,
    datePublished: article.frontmatter.date,
    dateModified: article.frontmatter.updatedAt ?? article.frontmatter.date,
    author: {
      "@type": "Organization",
      name: "トメピタ",
      url: BASE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "トメピタ",
      url: BASE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/logo.svg`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/articles/${slugStr}`,
    },
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <JsonLd data={jsonLdData} />

      <Breadcrumb
        items={[
          { label: "トップ", href: "/" },
          { label: "コラム", href: "/articles" },
          { label: categoryLabel, href: `/articles/category/${article.frontmatter.category}` },
          { label: article.frontmatter.title },
        ]}
        currentPath={`/articles/${slugStr}`}
      />

      <article>
        <header className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {categoryLabel}
            </span>
          </div>
          <h1 className="mb-4 text-2xl font-bold leading-tight sm:text-3xl">
            {article.frontmatter.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="size-4" />
              {article.frontmatter.date}
            </span>
            {article.frontmatter.updatedAt &&
              article.frontmatter.updatedAt !== article.frontmatter.date && (
                <span className="flex items-center gap-1">
                  更新: {article.frontmatter.updatedAt}
                </span>
              )}
          </div>
          {article.frontmatter.tags && article.frontmatter.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Tag className="size-4 text-muted-foreground" />
              {article.frontmatter.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        <TableOfContents items={tocItems} />

        <div className="prose prose-gray max-w-none dark:prose-invert prose-headings:scroll-mt-20 prose-headings:font-bold prose-h2:mt-10 prose-h2:border-b prose-h2:pb-2 prose-h3:mt-8 prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-li:marker:text-primary">
          <MDXRemote
            source={article.content}
            options={{
              mdxOptions: {
                remarkPlugins: [remarkGfm],
                rehypePlugins: [rehypeSlug],
              },
            }}
            components={{
              table: (props) => (
                <div className="article-table-wrapper">
                  <table {...props} />
                </div>
              ),
            }}
          />
        </div>
      </article>

      <div className="mt-12 border-t pt-8">
        {article.frontmatter.carSlug && (
          <div className="mb-6 rounded-lg border bg-primary/5 p-4">
            <p className="mb-2 text-sm font-medium">
              この車種の詳細スペック・駐車場判定はこちら
            </p>
            <Link
              href={`/car/${article.frontmatter.carSlug}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              車種ページで駐車場適合を確認する →
            </Link>
          </div>
        )}

        {relatedArticles.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-4 text-lg font-bold">関連記事</h2>
            <ul className="space-y-2">
              {relatedArticles.slice(0, 5).map((ra) => (
                <li key={ra.slug}>
                  <Link
                    href={`/articles/${ra.slug}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {ra.frontmatter.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link
          href="/articles"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          コラム一覧に戻る
        </Link>
      </div>
    </div>
  );
}
