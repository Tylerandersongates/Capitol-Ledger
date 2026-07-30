"use client";

import { useState } from "react";

type DiagnosticResult = {
  edge?: string;
  nodejs?: string;
};

export default function SentryDiagnosticPage() {
  const [result, setResult] = useState<DiagnosticResult>({});
  const [token, setToken] = useState("");

  async function runDiagnostic(runtime: "edge" | "server") {
    const resultKey = runtime === "server" ? "nodejs" : "edge";
    setResult((current) => ({ ...current, [resultKey]: "Sending…" }));

    try {
      const response = await fetch(`/api/diagnostics/sentry/${runtime}`, {
        method: "POST",
        headers: {
          "x-capitolwonk-diagnostic-token": token
        }
      });
      const payload = response.headers.get("content-type")?.includes("application/json") ? await response.json() : null;
      const status = payload?.accepted && payload?.flushed ? "Accepted and flushed" : `Rejected (${response.status})`;
      setResult((current) => ({ ...current, [resultKey]: status }));
    } catch {
      setResult((current) => ({ ...current, [resultKey]: "Request failed" }));
    }
  }

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", margin: "48px auto", maxWidth: 520, padding: "0 24px" }}>
      <h1>Sentry runtime diagnostic</h1>
      <p>This temporary Preview-only page sends fixed synthetic errors. It does not send entered text, user data, replay, or tracing.</p>
      <label style={{ display: "grid", gap: 8, marginTop: 24 }}>
        One-time diagnostic token
        <input
          aria-label="One-time diagnostic token"
          autoComplete="off"
          onChange={(event) => setToken(event.target.value)}
          spellCheck={false}
          type="password"
          value={token}
        />
      </label>
      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        <button disabled={!token} onClick={() => void runDiagnostic("server")} type="button">
          Send Node.js diagnostic
        </button>
        <button disabled={!token} onClick={() => void runDiagnostic("edge")} type="button">
          Send Edge diagnostic
        </button>
      </div>
      <dl style={{ display: "grid", gap: 8, marginTop: 24 }}>
        <div>
          <dt>Node.js</dt>
          <dd>{result.nodejs ?? "Not sent"}</dd>
        </div>
        <div>
          <dt>Edge</dt>
          <dd>{result.edge ?? "Not sent"}</dd>
        </div>
      </dl>
    </main>
  );
}
