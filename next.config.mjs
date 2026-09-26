import { withSentryConfig } from "@sentry/nextjs";
import { securityHeaders } from "./lib/security-headers.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  typedRoutes: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders()
      },
      {
        source: "/brief",
        headers: securityHeaders({ allowVideo: true })
      },
      {
        source: "/brief/:path*",
        headers: securityHeaders({ allowVideo: true })
      }
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.congress.gov" },
      { protocol: "https", hostname: "congress.gov" }
    ]
  }
};

export default withSentryConfig(nextConfig, {
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN
  },
  telemetry: false
});
