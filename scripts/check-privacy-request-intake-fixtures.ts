#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  isPrivacyRequestStatusTransitionAllowed,
  privacyRequestDetailMaxLength,
  privacyRequestPayloadSchema,
  privacyRequestResolutions
} from "@/lib/privacy-request-contract";
import {
  getPrivacyRequestFallbackEmail,
  isPrivacyRequestIntakeEnabled
} from "@/lib/privacy-request-activation";
import {
  createPrivacyRequestForUser,
  listPrivacyRequestsForUser,
  type PrivacyRequestDatabaseClient
} from "@/lib/privacy-requests";

for (const value of [undefined, "", "false", "TRUE", "1", "true "]) {
  assert.equal(
    isPrivacyRequestIntakeEnabled({ PRIVACY_REQUEST_INTAKE_ENABLED: value }),
    false,
    `PRIVACY_REQUEST_INTAKE_ENABLED=${String(value)} must fail closed`
  );
}
assert.equal(isPrivacyRequestIntakeEnabled({ PRIVACY_REQUEST_INTAKE_ENABLED: "true" }), true);

for (const value of [undefined, "", "privacy", "mailto:privacy@example.com", "privacy @example.com"]) {
  assert.equal(
    getPrivacyRequestFallbackEmail({ PRIVACY_REQUEST_EMAIL: value }),
    null,
    `PRIVACY_REQUEST_EMAIL=${String(value)} must not be published`
  );
}
assert.equal(
  getPrivacyRequestFallbackEmail({ PRIVACY_REQUEST_EMAIL: " privacy@capitolwonk.example " }),
  "privacy@capitolwonk.example"
);

assert.deepEqual(
  privacyRequestPayloadSchema.parse({ requestType: "data_export", detail: "  saved alerts  " }),
  { requestType: "data_export", detail: "saved alerts" }
);
assert.deepEqual(privacyRequestPayloadSchema.parse({ requestType: "correction", detail: "   " }), {
  requestType: "correction",
  detail: null
});
assert.equal(privacyRequestPayloadSchema.safeParse({ requestType: "password_reset" }).success, false);
assert.equal(
  privacyRequestPayloadSchema.safeParse({ requestType: "other", detail: "x".repeat(privacyRequestDetailMaxLength + 1) }).success,
  false
);
assert.equal(privacyRequestPayloadSchema.safeParse({ requestType: "other", email: "extra@example.com" }).success, false);

assert.equal(isPrivacyRequestStatusTransitionAllowed("new", "reviewing"), true);
assert.equal(isPrivacyRequestStatusTransitionAllowed("new", "resolved"), true);
assert.equal(isPrivacyRequestStatusTransitionAllowed("reviewing", "resolved"), true);
assert.equal(isPrivacyRequestStatusTransitionAllowed("reviewing", "new"), false);
assert.equal(isPrivacyRequestStatusTransitionAllowed("resolved", "reviewing"), false);
assert.deepEqual(privacyRequestResolutions, [
  "fulfilled",
  "partially_fulfilled",
  "denied",
  "redirected_to_account_deletion",
  "withdrawn",
  "duplicate",
  "no_action_needed"
]);

async function checkPersistenceContract() {
  const calls: Array<{ query: string; values: unknown[] }> = [];
  const now = new Date("2026-09-12T18:00:00.000Z");
  const persistedRow = {
    acknowledgedAt: now,
    created: true,
    id: "privacy-request-1",
    requestType: "data_export" as const,
    requestedAt: now,
    resolution: null,
    resolvedAt: null,
    status: "new" as const
  };
  const database: PrivacyRequestDatabaseClient = {
    async $queryRawUnsafe<T>(query: string, ...values: unknown[]) {
      calls.push({ query, values });
      return [persistedRow] as unknown as T;
    }
  };

  const created = await createPrivacyRequestForUser(
    "user-1",
    { requestType: "data_export", detail: "Saved alerts" },
    { database, now, requestId: "privacy-request-1" }
  );
  assert.equal(created.created, true);
  assert.equal(created.request.id, "privacy-request-1");
  assert.match(calls[0]?.query ?? "", /ON CONFLICT \("userId", "requestType"\)/);
  assert.match(calls[0]?.query ?? "", /WHERE "status" IN \('new', 'reviewing'\)/);
  assert.deepEqual(calls[0]?.values, ["privacy-request-1", "user-1", "data_export", "Saved alerts", now]);
  assert.equal(calls[0]?.values.some((value) => value === "extra@example.com"), false);

  calls.length = 0;
  const requests = await listPrivacyRequestsForUser("user-1", { database });
  assert.equal(requests[0]?.requestType, "data_export");
  assert.match(calls[0]?.query ?? "", /WHERE "userId" = \$1/);
  assert.deepEqual(calls[0]?.values, ["user-1"]);
}

async function checkDisabledSurface() {
  const originalGate = process.env.PRIVACY_REQUEST_INTAKE_ENABLED;
  const originalEmail = process.env.PRIVACY_REQUEST_EMAIL;
  const runtimeGlobals = globalThis as typeof globalThis & { React?: typeof import("react") };
  const originalReact = runtimeGlobals.React;

  try {
    delete process.env.PRIVACY_REQUEST_INTAKE_ENABLED;
    delete process.env.PRIVACY_REQUEST_EMAIL;
    runtimeGlobals.React = await import("react");
    const [{ NextRequest }, { renderToStaticMarkup }, route, { default: PrivacyRequestPage }] = await Promise.all([
      import("next/server"),
      import("react-dom/server"),
      import("@/app/api/privacy/requests/route"),
      import("@/app/privacy/request/page")
    ]);

    const expectedPayload = {
      code: "PRIVACY_REQUEST_INTAKE_DISABLED",
      error: "Privacy-request intake is not active in this build. No request was submitted."
    };
    const getResponse = await route.GET();
    assert.equal(getResponse.status, 503);
    assert.equal(getResponse.headers.get("cache-control"), "no-store");
    assert.deepEqual(await getResponse.json(), expectedPayload);

    const postResponse = await route.POST(
      new NextRequest("https://capitolwonk.example/api/privacy/requests", {
        body: "not-json-and-must-not-be-parsed-while-disabled",
        method: "POST"
      })
    );
    assert.equal(postResponse.status, 503);
    assert.deepEqual(await postResponse.json(), expectedPayload);

    const markup = renderToStaticMarkup(await PrivacyRequestPage());
    assert.ok(markup.includes("First-party intake is not active"));
    assert.ok(markup.includes("verified fallback privacy mailbox has not been published"));
    assert.ok(!markup.includes("Submit privacy request"));
    assert.ok(!markup.includes("mailto:"));
  } finally {
    if (originalGate === undefined) delete process.env.PRIVACY_REQUEST_INTAKE_ENABLED;
    else process.env.PRIVACY_REQUEST_INTAKE_ENABLED = originalGate;
    if (originalEmail === undefined) delete process.env.PRIVACY_REQUEST_EMAIL;
    else process.env.PRIVACY_REQUEST_EMAIL = originalEmail;
    if (originalReact === undefined) Reflect.deleteProperty(runtimeGlobals, "React");
    else runtimeGlobals.React = originalReact;
  }
}

Promise.all([checkPersistenceContract(), checkDisabledSurface()])
  .then(() => {
    console.log("Privacy-request intake fixtures passed.");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
