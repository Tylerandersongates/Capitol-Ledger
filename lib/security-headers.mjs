function readSentryOrigin() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
  if (!dsn) return null;

  try {
    return new URL(dsn).origin;
  } catch {
    return null;
  }
}

export function buildContentSecurityPolicy({ allowVideo = false } = {}) {
  const sentryOrigin = readSentryOrigin();
  const isVercelPreview = process.env.VERCEL_ENV === "preview";
  const connectSources = ["'self'", sentryOrigin, isVercelPreview ? "https://vercel.live" : null].filter(Boolean);
  const frameSources = [allowVideo ? "https://www.youtube-nocookie.com" : null, isVercelPreview ? "https://vercel.live" : null].filter(Boolean);
  const imageSources = ["'self'", "data:", "blob:", "https://www.congress.gov", "https://congress.gov", isVercelPreview ? "https://vercel.live" : null].filter(Boolean);
  const scriptSources = ["'self'", "'unsafe-inline'", isVercelPreview ? "https://vercel.live" : null].filter(Boolean);

  return [
    "default-src 'self'",
    "base-uri 'self'",
    `connect-src ${connectSources.join(" ")}`,
    "font-src 'self' data:",
    "form-action 'self'",
    "frame-ancestors 'none'",
    `frame-src ${frameSources.length ? frameSources.join(" ") : "'none'"}`,
    `img-src ${imageSources.join(" ")}`,
    "manifest-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "worker-src 'self' blob:"
  ].join("; ");
}

export const baselineSecurityHeaders = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(), payment=(), usb=()" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" }
];

export function securityHeaders(options) {
  return [
    ...baselineSecurityHeaders,
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy(options) }
  ];
}
