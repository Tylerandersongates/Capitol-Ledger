#!/usr/bin/env node

import assert from "node:assert/strict";
import { isAccountDeletionEnabled } from "@/lib/account-deletion-activation";

for (const value of [undefined, "", "false", "TRUE", "1", "true "]) {
  assert.equal(
    isAccountDeletionEnabled({ ACCOUNT_DELETION_ENABLED: value }),
    false,
    `ACCOUNT_DELETION_ENABLED=${String(value)} must fail closed`
  );
}

assert.equal(
  isAccountDeletionEnabled({ ACCOUNT_DELETION_ENABLED: "true" }),
  true,
  "only the exact value true should activate account deletion"
);

async function checkDisabledApi() {
  const originalValue = process.env.ACCOUNT_DELETION_ENABLED;
  const runtimeGlobals = globalThis as typeof globalThis & { React?: typeof import("react") };
  const originalReact = runtimeGlobals.React;

  try {
    delete process.env.ACCOUNT_DELETION_ENABLED;
    runtimeGlobals.React = await import("react");
    const [{ NextRequest }, { renderToStaticMarkup }, route, { default: PrivacyPage }, { default: SupportPage }] = await Promise.all([
      import("next/server"),
      import("react-dom/server"),
      import("@/app/api/account/deletion-request/route"),
      import("@/app/privacy/page"),
      import("@/app/support/page")
    ]);
    const expectedPayload = {
      code: "ACCOUNT_DELETION_DISABLED",
      error: "Account deletion is temporarily unavailable. No account data was changed."
    };

    const getResponse = await route.GET();
    assert.equal(getResponse.status, 503, "the deletion status API must be unavailable by default");
    assert.equal(getResponse.headers.get("cache-control"), "no-store");
    assert.deepEqual(await getResponse.json(), expectedPayload);

    const postResponse = await route.POST(
      new NextRequest("https://capitolwonk.example/api/account/deletion-request", {
        body: JSON.stringify({ confirmation: "DELETE", subscriptionAcknowledged: true }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      })
    );
    assert.equal(postResponse.status, 503, "the destructive deletion API must be unavailable by default");
    assert.equal(postResponse.headers.get("cache-control"), "no-store");
    assert.deepEqual(await postResponse.json(), expectedPayload);

    const disabledPrivacyMarkup = renderToStaticMarkup(PrivacyPage());
    const disabledSupportMarkup = renderToStaticMarkup(SupportPage());
    assert.ok(
      !disabledPrivacyMarkup.includes('/settings#delete-account'),
      "privacy must not expose the deletion entry point while disabled"
    );
    assert.ok(
      disabledPrivacyMarkup.includes("account-deletion assistance"),
      "privacy should keep a non-destructive support path while deletion is disabled"
    );
    assert.ok(
      !disabledSupportMarkup.includes('/settings#delete-account'),
      "support must not expose the deletion entry point while disabled"
    );
    assert.ok(
      disabledSupportMarkup.includes('/feedback?source=privacy-request'),
      "support should keep its non-destructive privacy-request path while deletion is disabled"
    );

    process.env.ACCOUNT_DELETION_ENABLED = "true";
    assert.ok(
      renderToStaticMarkup(PrivacyPage()).includes('/settings#delete-account'),
      "privacy should expose deletion after an exact explicit activation"
    );
    assert.ok(
      renderToStaticMarkup(SupportPage()).includes('/settings#delete-account'),
      "support should expose deletion after an exact explicit activation"
    );
  } finally {
    if (originalValue === undefined) delete process.env.ACCOUNT_DELETION_ENABLED;
    else process.env.ACCOUNT_DELETION_ENABLED = originalValue;
    if (originalReact === undefined) Reflect.deleteProperty(runtimeGlobals, "React");
    else runtimeGlobals.React = originalReact;
  }
}

checkDisabledApi()
  .then(() => {
    console.log("Account deletion activation fixtures passed.");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
