import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/** 日本語エリア名→ローマ字slugリダイレクト */
const wardRedirects: { source: string; destination: string; permanent: true }[] = [
  { source: "/area/千代田区", destination: "/area/chiyoda", permanent: true },
  { source: "/area/中央区", destination: "/area/chuo", permanent: true },
  { source: "/area/港区", destination: "/area/minato", permanent: true },
  { source: "/area/新宿区", destination: "/area/shinjuku", permanent: true },
  { source: "/area/文京区", destination: "/area/bunkyo", permanent: true },
  { source: "/area/台東区", destination: "/area/taito", permanent: true },
  { source: "/area/墨田区", destination: "/area/sumida", permanent: true },
  { source: "/area/江東区", destination: "/area/koto", permanent: true },
  { source: "/area/品川区", destination: "/area/shinagawa", permanent: true },
  { source: "/area/目黒区", destination: "/area/meguro", permanent: true },
  { source: "/area/大田区", destination: "/area/ota", permanent: true },
  { source: "/area/世田谷区", destination: "/area/setagaya", permanent: true },
  { source: "/area/渋谷区", destination: "/area/shibuya", permanent: true },
  { source: "/area/中野区", destination: "/area/nakano", permanent: true },
  { source: "/area/杉並区", destination: "/area/suginami", permanent: true },
  { source: "/area/豊島区", destination: "/area/toshima", permanent: true },
  { source: "/area/北区", destination: "/area/kita", permanent: true },
  { source: "/area/荒川区", destination: "/area/arakawa", permanent: true },
  { source: "/area/板橋区", destination: "/area/itabashi", permanent: true },
  { source: "/area/練馬区", destination: "/area/nerima", permanent: true },
  { source: "/area/足立区", destination: "/area/adachi", permanent: true },
  { source: "/area/葛飾区", destination: "/area/katsushika", permanent: true },
  { source: "/area/江戸川区", destination: "/area/edogawa", permanent: true },
  // /area/XX区/car/:slug パターン
  { source: "/area/千代田区/car/:slug", destination: "/area/chiyoda/car/:slug", permanent: true },
  { source: "/area/中央区/car/:slug", destination: "/area/chuo/car/:slug", permanent: true },
  { source: "/area/港区/car/:slug", destination: "/area/minato/car/:slug", permanent: true },
  { source: "/area/新宿区/car/:slug", destination: "/area/shinjuku/car/:slug", permanent: true },
  { source: "/area/文京区/car/:slug", destination: "/area/bunkyo/car/:slug", permanent: true },
  { source: "/area/台東区/car/:slug", destination: "/area/taito/car/:slug", permanent: true },
  { source: "/area/墨田区/car/:slug", destination: "/area/sumida/car/:slug", permanent: true },
  { source: "/area/江東区/car/:slug", destination: "/area/koto/car/:slug", permanent: true },
  { source: "/area/品川区/car/:slug", destination: "/area/shinagawa/car/:slug", permanent: true },
  { source: "/area/目黒区/car/:slug", destination: "/area/meguro/car/:slug", permanent: true },
  { source: "/area/大田区/car/:slug", destination: "/area/ota/car/:slug", permanent: true },
  { source: "/area/世田谷区/car/:slug", destination: "/area/setagaya/car/:slug", permanent: true },
  { source: "/area/渋谷区/car/:slug", destination: "/area/shibuya/car/:slug", permanent: true },
  { source: "/area/中野区/car/:slug", destination: "/area/nakano/car/:slug", permanent: true },
  { source: "/area/杉並区/car/:slug", destination: "/area/suginami/car/:slug", permanent: true },
  { source: "/area/豊島区/car/:slug", destination: "/area/toshima/car/:slug", permanent: true },
  { source: "/area/北区/car/:slug", destination: "/area/kita/car/:slug", permanent: true },
  { source: "/area/荒川区/car/:slug", destination: "/area/arakawa/car/:slug", permanent: true },
  { source: "/area/板橋区/car/:slug", destination: "/area/itabashi/car/:slug", permanent: true },
  { source: "/area/練馬区/car/:slug", destination: "/area/nerima/car/:slug", permanent: true },
  { source: "/area/足立区/car/:slug", destination: "/area/adachi/car/:slug", permanent: true },
  { source: "/area/葛飾区/car/:slug", destination: "/area/katsushika/car/:slug", permanent: true },
  { source: "/area/江戸川区/car/:slug", destination: "/area/edogawa/car/:slug", permanent: true },
];

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      // www なし → www あり 301リダイレクト
      {
        source: "/:path*",
        has: [{ type: "host", value: "tomepita.com" }],
        destination: "https://www.tomepita.com/:path*",
        permanent: true,
      },
      ...wardRedirects,
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "bayashi-labinc",

  project: "tomepita",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
