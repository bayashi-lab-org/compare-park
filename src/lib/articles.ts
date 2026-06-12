import fs from "fs";
import path from "path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content");

export interface ArticleFrontmatter {
  title: string;
  description: string;
  category: string;
  date: string;
  updatedAt?: string;
  carSlug?: string;
  tags?: string[];
}

export interface Article {
  slug: string;
  frontmatter: ArticleFrontmatter;
  content: string;
}

function getMdxFiles(dir: string, baseDir: string = dir): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getMdxFiles(fullPath, baseDir));
    } else if (entry.name.endsWith(".mdx")) {
      const relativePath = path.relative(baseDir, fullPath);
      files.push(relativePath);
    }
  }

  return files;
}

function parseArticle(relativePath: string): Article {
  const fullPath = path.join(CONTENT_DIR, relativePath);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  const slug = relativePath.replace(/\.mdx$/, "");

  return {
    slug,
    frontmatter: data as ArticleFrontmatter,
    content,
  };
}

// 本番ビルドでは記事一覧を使い回す（車種ページ等から大量に呼ばれるため）。
// 開発時はキャッシュせず、記事ファイルの編集を即時反映する。
let articlesCache: Article[] | null = null;

export function getArticles(): Article[] {
  if (process.env.NODE_ENV !== "production") {
    return loadArticles();
  }
  if (!articlesCache) {
    articlesCache = loadArticles();
  }
  return articlesCache;
}

function loadArticles(): Article[] {
  const files = getMdxFiles(CONTENT_DIR);
  return files
    .map(parseArticle)
    .sort(
      (a, b) =>
        new Date(b.frontmatter.date).getTime() -
        new Date(a.frontmatter.date).getTime()
    );
}

export function getArticleBySlug(slug: string): Article | null {
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  const relativePath = `${slug}.mdx`;
  return parseArticle(relativePath);
}

export function getArticlesByCategory(category: string): Article[] {
  return getArticles().filter((a) => a.frontmatter.category === category);
}

export function getArticlesByCarSlug(carSlug: string): Article[] {
  return getArticles().filter((a) => a.frontmatter.carSlug === carSlug);
}

export const ARTICLE_CATEGORIES: Record<string, string> = {
  cars: "車種別ガイド",
  "size-guide": "サイズ規格別",
  area: "エリア別",
  knowledge: "知識・ハウツー",
  compare: "車種比較",
};
