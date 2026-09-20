import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

function filesAt(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const name = path.join(dir, entry.name);
    return entry.isDirectory() ? filesAt(name) : [name];
  });
}

const articles = filesAt("content").filter((file) => file.endsWith(".mdx"));
const articlePaths = new Set(articles.map((file) => `/articles/${file.slice(8, -4)}`));
const seed = readFileSync("src/db/seed/index.ts", "utf8");
const carSlugs = new Set([...seed.matchAll(/modelSlug:\s*"([^"]+)"/g)].map((match) => match[1]));
const constants = readFileSync("src/lib/constants.ts", "utf8");
const knownSlugs = new Set([...constants.matchAll(/slug:\s*"([^"]+)"/g)].map((match) => match[1]));
const errors = [];
for (const file of articles) {
  const content = readFileSync(file, "utf8");
  const carSlug = content.match(/^carSlug:\s*"([^"]+)"/m)?.[1];
  if (carSlug && !carSlugs.has(carSlug)) errors.push(`${file}: 未登録のcarSlug ${carSlug}`);
  for (const match of content.matchAll(/\]\((\/[^\s)]+)\)/g)) {
    const href = match[1].split(/[?#]/)[0].replace(/\/$/, "") || "/";
    let valid = existsSync(`src/app${href === "/" ? "" : href}/page.tsx`);
    if (href.startsWith("/articles/category/")) valid = ["cars", "knowledge", "size-guide", "compare", "area"].includes(href.split("/")[3]);
    else if (href.startsWith("/articles/")) valid = articlePaths.has(href);
    else if (/^\/car\/[^/]+$/.test(href)) valid = carSlugs.has(href.split("/")[2]);
    else if (/^\/area\/[^/]+$/.test(href)) valid = knownSlugs.has(href.split("/")[2]);
    else if (/^\/parking\/size\/[^/]+$/.test(href)) valid = knownSlugs.has(href.split("/")[3]);
    if (!valid) errors.push(`${file}:${content.slice(0, match.index).split("\n").length} ${href}`);
  }
  if (/データが確認できました|正しい数値で記事を執筆します/.test(content)) errors.push(`${file}: 制作メモが残っています`);
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`${articles.length}記事: 内部リンク・制作メモの検査に合格`);
}
