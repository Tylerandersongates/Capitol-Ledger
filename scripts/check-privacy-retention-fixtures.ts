#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import {
  runPrivacyRetentionSweep,
  type PrivacyRetentionDependencies
} from "@/lib/privacy-retention";
import {
  sanitizeTelemetryBreadcrumb,
  sanitizeTelemetryEvent,
  sanitizeTelemetryText,
  sanitizeUrlForTelemetry
} from "@/lib/privacy-telemetry";
import { sendEmailWithResend } from "@/lib/resend-email";

type RetentionCall = {
  cutoff: Date;
  limit: number;
  name: keyof Omit<PrivacyRetentionDependencies, "hasDatabase">;
};

function retentionFixture(hasDatabase = true) {
  const calls: RetentionCall[] = [];
  const operation = (name: RetentionCall["name"], result: number) => async (cutoff: Date, limit: number) => {
    calls.push({ cutoff, limit, name });
    return result;
  };
  const dependencies: PrivacyRetentionDependencies = {
    deleteExpiredAuthSessions: operation("deleteExpiredAuthSessions", 1),
    deleteExpiredEmailVerificationTokens: operation("deleteExpiredEmailVerificationTokens", 2),
    deleteExpiredPasswordResetTokens: operation("deleteExpiredPasswordResetTokens", 3),
    deleteLegacyFeedback: operation("deleteLegacyFeedback", 4),
    deleteOldTeamInvites: operation("deleteOldTeamInvites", 5),
    hasDatabase: () => hasDatabase,
    recoverStaleCleanupJobs: operation("recoverStaleCleanupJobs", 6)
  };
  return { calls, dependencies };
}

async function main() {
  assert.equal(
    sanitizeUrlForTelemetry("https://capitolwonk.test/reset-password?token=private#confirm"),
    "https://capitolwonk.test/reset-password"
  );
  assert.equal(sanitizeUrlForTelemetry("/feedback?source=support#form"), "/feedback");
  assert.equal(sanitizeUrlForTelemetry("/dashboard"), "/dashboard");

  const text = sanitizeTelemetryText(
    "GET https://capitolwonk.test/invite?token=private Bearer secret-token authorization=private"
  );
  assert.ok(!text.includes("private"));
  assert.ok(!text.includes("secret-token"));
  assert.ok(text.includes("https://capitolwonk.test/invite"));

  const breadcrumb = sanitizeTelemetryBreadcrumb({
    data: {
      authorization: "Bearer private",
      count: 2,
      url: "https://capitolwonk.test/verify?token=private"
    },
    message: "Opened /verify?code=private"
  });
  assert.equal(breadcrumb.data?.authorization, "[Filtered]");
  assert.equal(breadcrumb.data?.count, 2);
  assert.equal(breadcrumb.data?.url, "https://capitolwonk.test/verify");
  assert.equal(breadcrumb.message, "Opened /verify");

  const event = sanitizeTelemetryEvent({
    breadcrumbs: [{ data: { requestUrl: "/reset?token=private" } }],
    exception: { values: [{ value: "Failed /reset?token=private" }] },
    extra: {
      deeplyNested: {
        one: { two: { three: { four: { accessToken: "private", safe: "not-exported-at-depth-limit" } } } }
      },
      nested: { clientSecret: "private", code: "private", token: "private" },
      reset_token: "private",
      safeCount: 1
    },
    request: {
      data: "token=private",
      headers: { Authorization: "Bearer private", Accept: "application/json" },
      query_string: "token=private",
      url: "https://capitolwonk.test/reset?token=private#confirm"
    }
  });
  assert.equal(event.request?.url, "https://capitolwonk.test/reset");
  assert.equal(event.request?.query_string, undefined);
  assert.equal(event.request?.headers?.Authorization, "[Filtered]");
  assert.equal(event.request?.headers?.Accept, "application/json");
  assert.equal(event.request?.data, undefined, "telemetry must drop captured request bodies entirely");
  assert.equal(event.extra?.reset_token, "[Filtered]");
  assert.deepEqual(event.extra?.nested, {
    clientSecret: "[Filtered]",
    code: "[Filtered]",
    token: "[Filtered]"
  });
  const deeplyNested = event.extra?.deeplyNested as {
    one?: { two?: { three?: { four?: unknown } } };
  };
  assert.equal(
    deeplyNested.one?.two?.three?.four,
    "[Filtered]",
    "objects beyond the traversal limit must be filtered instead of returned raw"
  );
  assert.equal(event.breadcrumbs?.[0]?.data?.requestUrl, "/reset");
  assert.equal(event.exception?.values?.[0]?.value, "Failed /reset");

  const rawBodyEvent = sanitizeTelemetryEvent({
    extra: {
      signedPayload: "notification-jws-private",
      signedTransactionJWS: "transaction-jws-private"
    },
    request: {
      data: JSON.stringify({
        password: "fixture-secret",
        signedPayload: "notification-jws-private",
        signedTransactionJWS: "transaction-jws-private"
      })
    }
  });
  assert.equal(rawBodyEvent.request?.data, undefined, "raw JSON request bodies must never reach telemetry");
  assert.equal(rawBodyEvent.extra?.signedPayload, "[Filtered]");
  assert.equal(rawBodyEvent.extra?.signedTransactionJWS, "[Filtered]");

  {
    const fixture = retentionFixture();
    const result = await runPrivacyRetentionSweep({ dependencies: fixture.dependencies, environment: {} });
    assert.equal(result.enabled, false);
    assert.deepEqual(fixture.calls, [], "the default-off sweep must perform no retention operations");
  }

  {
    const fixture = retentionFixture(false);
    const result = await runPrivacyRetentionSweep({
      dependencies: fixture.dependencies,
      environment: { CAPITOLWONK_PRIVACY_RETENTION_SWEEP_ENABLED: "true" }
    });
    assert.equal(result.enabled, false);
    assert.deepEqual(fixture.calls, [], "the sweep must perform no operations without a database");
  }

  const now = new Date("2026-09-11T18:00:00.000Z");
  {
    const fixture = retentionFixture();
    const result = await runPrivacyRetentionSweep({
      dependencies: fixture.dependencies,
      environment: { CAPITOLWONK_PRIVACY_RETENTION_SWEEP_ENABLED: "true" },
      limit: 1_000,
      now
    });
    assert.equal(result.enabled, true);
    assert.equal(result.legacyFeedbackEnabled, false);
    assert.equal(result.counts.legacyFeedback, 0);
    assert.deepEqual(
      fixture.calls.map((call) => call.name),
      [
        "recoverStaleCleanupJobs",
        "deleteExpiredAuthSessions",
        "deleteExpiredEmailVerificationTokens",
        "deleteExpiredPasswordResetTokens",
        "deleteOldTeamInvites"
      ]
    );
    assert.ok(fixture.calls.every((call) => call.limit === 100), "every operation must use the bounded batch limit");
    assert.equal(fixture.calls[0]?.cutoff.toISOString(), "2026-09-11T17:50:00.000Z");
    assert.equal(fixture.calls[4]?.cutoff.toISOString(), "2026-08-12T18:00:00.000Z");
  }

  {
    const fixture = retentionFixture();
    const result = await runPrivacyRetentionSweep({
      dependencies: fixture.dependencies,
      environment: {
        CAPITOLWONK_LEGACY_FEEDBACK_RETENTION_ENABLED: "true",
        CAPITOLWONK_PRIVACY_RETENTION_SWEEP_ENABLED: "true"
      },
      limit: 0,
      now
    });
    assert.equal(result.legacyFeedbackEnabled, true);
    assert.equal(result.counts.legacyFeedback, 4);
    assert.equal(fixture.calls.at(-1)?.name, "deleteLegacyFeedback");
    assert.ok(fixture.calls.every((call) => call.limit === 1));
    assert.equal(fixture.calls.at(-1)?.cutoff.toISOString(), "2025-09-11T18:00:00.000Z");
  }

  {
    const originalApiKey = process.env.RESEND_API_KEY;
    const originalFetch = globalThis.fetch;
    try {
      process.env.RESEND_API_KEY = "re_fixture_key";
      globalThis.fetch = (async () => new Response(
        JSON.stringify({ message: "provider detail token=private-provider-value" }),
        { status: 422 }
      )) as typeof globalThis.fetch;
      await assert.rejects(
        sendEmailWithResend({
          from: "CapitolWonk <accounts@example.test>",
          subject: "Fixture",
          text: "Fixture",
          to: "person@example.test"
        }),
        (error) => error instanceof Error && error.message === "Resend delivery failed with status 422."
      );
    } finally {
      globalThis.fetch = originalFetch;
      if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = originalApiKey;
    }
  }

  const cleanupSource = fs.readFileSync("lib/account-deletion-cleanup.ts", "utf8");
  const feedbackSource = fs.readFileSync("components/feedback-form.tsx", "utf8");
  const retentionSource = fs.readFileSync("lib/privacy-retention.ts", "utf8");
  const sentryServerSource = fs.readFileSync("sentry.server.config.ts", "utf8");
  const sentryEdgeSource = fs.readFileSync("sentry.edge.config.ts", "utf8");
  for (const unsafeLogDetail of ["jobId: job.id", "kind: job.kind", "message: error instanceof Error"]) {
    assert.ok(!cleanupSource.includes(unsafeLogDetail), `cleanup host logs must exclude ${unsafeLogDetail}`);
  }
  assert.ok(!feedbackSource.includes("url: window.location.href"), "feedback must not send query strings or fragments");
  assert.ok(feedbackSource.includes("sanitizeUrlForTelemetry(window.location.href)"));
  assert.ok(retentionSource.includes("FOR UPDATE SKIP LOCKED"), "retention deletes must use bounded concurrent batches");
  assert.ok(retentionSource.includes("CAPITOLWONK_LEGACY_FEEDBACK_RETENTION_ENABLED"));
  assert.ok(sentryServerSource.includes('Sentry.httpIntegration({ maxIncomingRequestBodySize: "none" })'));
  assert.ok(sentryServerSource.includes("data: false"));
  assert.ok(sentryEdgeSource.includes("data: false"));

  console.log("Privacy telemetry and retention fixture checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
