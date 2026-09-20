type EventParameters = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Googleタグの読込前も同じキューに入れる。自由入力・住所・座標は送信しない。 */
export function trackEvent(name: string, parameters: EventParameters = {}): void {
  if (typeof window === "undefined") return;
  if (window.gtag) {
    window.gtag("event", name, parameters);
    return;
  }
  window.dataLayer ??= [];
  // gtagの公式キュー形式（arguments）に合わせる。
  function enqueue(..._args: unknown[]) {
    void _args;
    // eslint-disable-next-line prefer-rest-params -- GoogleタグのキューはArgumentsを受け取る
    window.dataLayer!.push(arguments);
  }
  enqueue("event", name, parameters);
}

export function getArticleCtaParameters(href: string, articleSlug: string) {
  const match = href.match(/^\/(car|parking)\/([a-z0-9-]+)(?:[?#].*)?$/);
  if (!match) return null;
  return { article_slug: articleSlug, target_type: match[1], target_slug: match[2] };
}
