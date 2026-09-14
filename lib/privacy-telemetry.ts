const filteredValue = "[Filtered]";

const urlFieldName = /^(?:href|pageUrl|requestUrl|url)$/i;

type TelemetryBreadcrumb = {
  data?: Record<string, unknown>;
  message?: string;
};

type TelemetryEvent = {
  breadcrumbs?: TelemetryBreadcrumb[];
  contexts?: Record<string, unknown>;
  exception?: {
    values?: Array<{
      value?: string;
    }>;
  };
  extra?: Record<string, unknown>;
  message?: string;
  request?: {
    data?: unknown;
    headers?: Record<string, unknown>;
    query_string?: unknown;
    url?: string;
  };
  tags?: Record<string, unknown>;
};

/**
 * Keep the app route needed for diagnostics while excluding query values and
 * fragments, which can contain auth, invite, reset, or task credentials.
 */
export function sanitizeUrlForTelemetry(value: string) {
  const boundary = value.search(/[?#]/);
  return boundary === -1 ? value : value.slice(0, boundary);
}

export function sanitizeTelemetryText(value: string) {
  return value
    .replace(/(?:https?:\/\/|\/)[^\s"'<>]*[?#][^\s"'<>]*/gi, (url) => sanitizeUrlForTelemetry(url))
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${filteredValue}`)
    .replace(/\b(token|code|cookie|secret|signature|password|authorization|api[-_]?key)=([^&\s#]+)/gi, `$1=${filteredValue}`);
}

function isSensitiveFieldName(key: string) {
  const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return (
    normalized === "apikey" ||
    normalized === "authorization" ||
    normalized === "code" ||
    normalized === "cookie" ||
    normalized === "password" ||
    normalized === "secret" ||
    normalized === "setcookie" ||
    normalized === "signature" ||
    normalized === "token" ||
    normalized === "xvercelcronsignature" ||
    /(?:code|jws|key|password|payload|secret|signature|token)$/.test(normalized)
  );
}

function sanitizeTelemetryValue(value: unknown, key: string, depth: number): unknown {
  if (isSensitiveFieldName(key)) return filteredValue;
  if (urlFieldName.test(key) && typeof value === "string") return sanitizeUrlForTelemetry(value);
  if (typeof value === "string") return sanitizeTelemetryText(value);
  if (depth >= 4 && value && typeof value === "object") return filteredValue;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeTelemetryValue(item, "", depth + 1));
  }
  if (value && typeof value === "object") {
    return sanitizeTelemetryData(value as Record<string, unknown>, depth + 1);
  }
  return value;
}

function sanitizeTelemetryData(data: Record<string, unknown>, depth = 0) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, sanitizeTelemetryValue(value, key, depth)])
  );
}

export function sanitizeTelemetryBreadcrumb<T extends TelemetryBreadcrumb>(breadcrumb: T): T {
  return {
    ...breadcrumb,
    ...(breadcrumb.message ? { message: sanitizeTelemetryText(breadcrumb.message) } : {}),
    ...(breadcrumb.data ? { data: sanitizeTelemetryData(breadcrumb.data) } : {})
  };
}

export function sanitizeTelemetryEvent<T extends TelemetryEvent>(event: T): T {
  const request = event.request
    ? {
        ...event.request,
        ...(event.request.url ? { url: sanitizeUrlForTelemetry(event.request.url) } : {}),
        ...(event.request.headers ? { headers: sanitizeTelemetryData(event.request.headers) } : {})
      }
    : undefined;

  if (request) {
    delete request.data;
    delete request.query_string;
  }

  return {
    ...event,
    ...(request ? { request } : {}),
    ...(event.breadcrumbs
      ? { breadcrumbs: event.breadcrumbs.map((breadcrumb) => sanitizeTelemetryBreadcrumb(breadcrumb)) }
      : {}),
    ...(event.contexts ? { contexts: sanitizeTelemetryData(event.contexts) } : {}),
    ...(event.exception?.values
      ? {
          exception: {
            ...event.exception,
            values: event.exception.values.map((value) => ({
              ...value,
              ...(value.value ? { value: sanitizeTelemetryText(value.value) } : {})
            }))
          }
        }
      : {}),
    ...(event.extra ? { extra: sanitizeTelemetryData(event.extra) } : {}),
    ...(event.message ? { message: sanitizeTelemetryText(event.message) } : {}),
    ...(event.tags ? { tags: sanitizeTelemetryData(event.tags) } : {})
  };
}
