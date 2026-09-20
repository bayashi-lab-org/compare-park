"use client";

import { useEffect } from "react";
import { getArticleCtaParameters, trackEvent } from "@/lib/analytics";

/** MDXと記事末尾の既存リンクを計測する。HTMLや遷移方法は変えない。 */
export function ArticleClickTracking({ articleSlug }: { articleSlug: string }) {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>("[data-article-content] a[href]");
      if (!link) return;
      const parameters = getArticleCtaParameters(link.getAttribute("href") ?? "", articleSlug);
      if (parameters) trackEvent("article_cta_click", parameters);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [articleSlug]);
  return null;
}
