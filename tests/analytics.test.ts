import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { trackEvent, getArticleCtaParameters } from "../src/lib/analytics";

afterEach(() => { Reflect.deleteProperty(globalThis, "window"); });

test("SSRでは何も送信せず、タグ読み込み前は公式形式でキューに入る", () => {
  assert.doesNotThrow(() => trackEvent("parking_check_start"));
  Object.defineProperty(globalThis, "window", { value: {}, configurable: true });
  trackEvent("parking_check_start", { car_slug: "alphard" });
  const queued = window.dataLayer![0] as IArguments;
  assert.deepEqual(Array.from(queued), ["event", "parking_check_start", { car_slug: "alphard" }]);
});

test("タグ読み込み済みならgtagへ一度だけ送る", () => {
  const calls: unknown[][] = [];
  Object.defineProperty(globalThis, "window", { value: { gtag: (...args: unknown[]) => calls.push(args) }, configurable: true });
  trackEvent("parking_check_complete", { result: "ng" });
  assert.deepEqual(calls, [["event", "parking_check_complete", { result: "ng" }]]);
});

test("記事CTAから住所・座標・クエリ文字列を送らない", () => {
  assert.deepEqual(getArticleCtaParameters("/car/alphard?lat=35&lng=139#checker", "cars/alphard"), { article_slug: "cars/alphard", target_type: "car", target_slug: "alphard" });
  assert.equal(getArticleCtaParameters("https://example.com/", "cars/alphard"), null);
  assert.equal(getArticleCtaParameters("/articles/cars/alphard", "cars/alphard"), null);
});
