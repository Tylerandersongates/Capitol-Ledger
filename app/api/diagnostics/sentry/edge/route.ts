import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export async function POST(request: Request) {
  if (!hasValidDiagnosticToken(request)) {
    return new Response(null, { status: 404 });
  }

  Sentry.withScope((scope) => {
    scope.setTag("capitolwonk.synthetic_diagnostic", "true");
    scope.setTag("capitolwonk.runtime", "edge");
    Sentry.captureException(new Error("CapitolWonk sanitized synthetic Edge geography scrub verification"));
  });

  const flushed = await Sentry.flush(5_000);

  return Response.json(
    { accepted: true, flushed, runtime: "edge" },
    { headers: { "Cache-Control": "no-store" }, status: flushed ? 202 : 503 }
  );
}

function hasValidDiagnosticToken(request: Request) {
  const expected = process.env.SENTRY_DIAGNOSTIC_TOKEN;
  const provided = request.headers.get("x-capitolwonk-diagnostic-token");

  if (!expected || !provided || expected.length !== provided.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= expected.charCodeAt(index) ^ provided.charCodeAt(index);
  }

  return mismatch === 0;
}
