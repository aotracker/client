import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withBundleAnalyzer from "@next/bundle-analyzer";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // Vercel already gzip/brotli at the edge. Next's gzip of streamed RSC
  // attaches many drain listeners to one Gzip stream (MaxListenersExceededWarning).
  compress: false,
  // Inline DISABLED_REGIONS into client bundles so ENABLED_REGIONS matches SSR.
  env: {
    DISABLED_REGIONS: process.env.DISABLED_REGIONS ?? "",
  },
  allowedDevOrigins: ["10.1.1.10"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "render.albiononline.com",
        pathname: "/v1/item/**",
      },
      {
        protocol: "https",
        hostname: "render.albiononline.com",
        pathname: "/v1/spell/**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/sitemaps/:id.xml",
        destination: "/sitemaps/:id",
      },
    ];
  },
};

export default withAnalyzer(withNextIntl(nextConfig));
