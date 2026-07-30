import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const diagnosticCookieName = "__Host-capitolwonk-sentry-diagnostic";

export async function GET() {
  const expected = process.env.SENTRY_DIAGNOSTIC_TOKEN;

  if (!expected) {
    return new Response(null, { status: 404 });
  }

  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Sentry geography verification</title>
  </head>
  <body>
    <main>
      <h1>Sentry geography verification</h1>
      <p>This temporary Preview-only control sends exactly one sanitized synthetic event.</p>
      <form method="post">
        <button type="submit">Send exactly one verification event</button>
      </form>
    </main>
  </body>
</html>`,
    {
      headers: {
        "Cache-Control": "no-store",
        "Content-Security-Policy":
          "default-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
        "Content-Type": "text/html; charset=utf-8",
        "Set-Cookie": `${diagnosticCookieName}=${encodeURIComponent(expected)}; Path=/; Max-Age=300; Secure; HttpOnly; SameSite=Strict`,
      },
    }
  );
}

export async function POST(request: Request) {
  if (!hasValidDiagnosticToken(request)) {
    return new Response(null, { status: 404 });
  }

  Sentry.withScope((scope) => {
    scope.setTag("capitolwonk.synthetic_diagnostic", "geo_deep_scrub_2026_07_30");
    scope.setTag("capitolwonk.runtime", "edge");
    Sentry.captureException(new Error("CapitolWonk sanitized synthetic Edge deep geography scrub verification"));
  });

  const flushed = await Sentry.flush(5_000);

  return Response.json(
    { accepted: true, flushed, runtime: "edge" },
    {
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie": `${diagnosticCookieName}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict`,
      },
      status: flushed ? 202 : 503,
    }
  );
}

function hasValidDiagnosticToken(request: Request) {
  const expected = process.env.SENTRY_DIAGNOSTIC_TOKEN;
  const provided =
    request.headers.get("x-capitolwonk-diagnostic-token") ??
    readCookie(request, diagnosticCookieName);

  if (!expected || !provided || expected.length !== provided.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= expected.charCodeAt(index) ^ provided.charCodeAt(index);
  }

  return mismatch === 0;
}

function readCookie(request: Request, name: string) {
  const match = request.headers
    .get("cookie")
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));

  if (!match) {
    return null;
  }

  try {
    return decodeURIComponent(match.slice(name.length + 1));
  } catch {
    return null;
  }
}
