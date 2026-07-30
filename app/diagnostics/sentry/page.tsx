"use client";

import { useState } from "react";

export default function SentryDiagnosticPage() {
  const [result, setResult] = useState("Not sent");
  const [token, setToken] = useState("");

  async function runDiagnostic() {
    setResult("Sending…");

    try {
      const response = await fetch("/api/diagnostics/sentry/edge", {
        method: "POST",
        headers: {
          "x-capitolwonk-diagnostic-token": token
        }
      });
      const payload = response.headers.get("content-type")?.includes("application/json") ? await response.json() : null;
      setResult(payload?.accepted && payload?.flushed ? "Accepted and flushed" : `Rejected (${response.status})`);
    } catch {
      setResult("Request failed");
    }
  }

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", margin: "48px auto", maxWidth: 520, padding: "0 24px" }}>
      <h1>Sentry Edge privacy verification</h1>
      <p>
        This temporary Preview-only page sends one fixed synthetic error. It does not send entered text, user data,
        replay, or tracing.
      </p>
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
      <button disabled={!token} onClick={() => void runDiagnostic()} style={{ marginTop: 20 }} type="button">
        Send Edge privacy diagnostic
      </button>
      <p aria-live="polite" style={{ marginTop: 24 }}>
        Edge: {result}
      </p>
    </main>
  );
}
