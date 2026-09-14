import * as Sentry from "@sentry/nextjs";
import { sanitizeTelemetryBreadcrumb, sanitizeTelemetryEvent } from "@/lib/privacy-telemetry";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  beforeBreadcrumb: (breadcrumb) => sanitizeTelemetryBreadcrumb(breadcrumb),
  beforeSend: (event) => sanitizeTelemetryEvent(event),
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  replaysOnErrorSampleRate: 0,
  replaysSessionSampleRate: 0,
  sendDefaultPii: false,
  tracesSampleRate: 0
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
