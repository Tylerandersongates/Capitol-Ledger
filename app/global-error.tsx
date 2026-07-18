"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ background: "#020b18", color: "#ffffff", fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <main style={{ margin: "0 auto", maxWidth: 440, padding: "96px 28px" }}>
          <div style={{ color: "#ffb12b", fontSize: 14, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            CapitolWonk CE
          </div>
          <h1 style={{ fontSize: 30, lineHeight: 1.15, margin: "18px 0 12px" }}>Something went wrong</h1>
          <p style={{ color: "rgba(255,255,255,0.62)", fontSize: 16, lineHeight: 1.6 }}>
            The error was recorded without session replay or default personal-data collection. Try loading this screen again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ background: "#ffb12b", border: 0, borderRadius: 16, color: "#061126", fontSize: 16, fontWeight: 700, marginTop: 24, padding: "14px 20px" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
