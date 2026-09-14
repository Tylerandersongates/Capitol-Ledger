import * as Sentry from "@sentry/nextjs";
import { sanitizeTelemetryBreadcrumb, sanitizeTelemetryEvent } from "@/lib/privacy-telemetry";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  beforeBreadcrumb: (breadcrumb) => sanitizeTelemetryBreadcrumb(breadcrumb),
  beforeSend: (event) => sanitizeTelemetryEvent(event),
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  integrations: (defaultIntegrations) => [
    ...defaultIntegrations.filter((integration) => integration.name !== "Http" && integration.name !== "RequestData"),
    Sentry.httpIntegration({ maxIncomingRequestBodySize: "none" }),
    Sentry.requestDataIntegration({
      include: { cookies: false, data: false, headers: true, ip: false, query_string: false, url: true }
    })
  ],
  sendDefaultPii: false,
  tracesSampleRate: 0
});
