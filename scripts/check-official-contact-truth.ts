import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const readSource = (relativePath: string) => readFile(path.join(projectRoot, relativePath), "utf8");

async function checkSourceContract() {
  const [component, memberContact, nativeWebView, persistence, route] = await Promise.all([
    readSource("components/member-email-action.tsx"),
    readSource("lib/member-contact.ts"),
    readSource("ios/CapitolLedgerNative/CapitolLedgerNative/CapitolLedgerWebView.swift"),
    readSource("lib/official-contact-messages.ts"),
    readSource("app/api/members/[bioguideId]/email/route.ts")
  ]);

  assert.doesNotMatch(route, /mailto:/, "The manual path must not prepare an empty-recipient mailto URL.");
  assert.doesNotMatch(component, /window\.(location|open)/, "External contact navigation must come from a user-tapped link.");
  assert.match(component, /href=\{pendingContactUrl\}/, "The prepared official URL must be exposed as a real link.");
  assert.match(component, /Copy subject/, "The manual path must expose an explicit subject-copy action.");
  assert.match(component, /Copy message/, "The manual path must expose an explicit message-copy action.");
  assert.match(component, /I did not send it/, "Abandoned drafts must have a truthful non-sent exit.");
  assert.match(component, /status === "confirmingError"/, "A failed confirmation must keep the prepared confirmation step available.");
  assert.match(route, /confirmationMode: session\?\.user\?\.id \? "account" : "local"/, "Signed-in confirmations must use account persistence.");
  assert.match(nativeWebView, /navigationAction\.navigationType == \.linkActivated/, "The native shell must open user-tapped external links.");
  assert.match(memberContact, /url\.protocol === "https:" \|\| url\.protocol === "http:"/, "Official contact links must reject unsafe URL schemes.");
  assert.match(persistence, /"deliveryStatus" = 'sent'/, "Cooldown reads must consider sent records only.");
  assert.match(
    persistence,
    /if \(deliveryStatus === "sent"\) officialContactCooldownStore\.set/,
    "Local prepared drafts must not start a cooldown."
  );
}

async function checkLocalCooldownContract() {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;

  const cooldownStore = new Map<string, number>();
  const messageStore: unknown[] = [];
  Object.assign(globalThis, {
    __capitolLedgerOfficialContactCooldownStore: cooldownStore,
    __capitolLedgerOfficialContactMessageStore: messageStore,
    __capitolLedgerOfficialContactSchemaReady: undefined
  });

  try {
    const contact = await import("../lib/official-contact-messages");
    const preparedCooldownKey = contact.cooldownKeyFor("A000001", "user:user-1");
    const prepared = await contact.recordOfficialContact({
      contactUrl: "https://example.house.gov/contact",
      cooldownKey: preparedCooldownKey,
      deliveryMode: "manual",
      deliveryStatus: "prepared",
      memberBioguideId: "A000001",
      memberChamber: "House",
      memberName: "Example Representative",
      memberState: "CA",
      message: "Please consider this constituent message.",
      senderEmail: "person@example.com",
      senderKey: "user:user-1",
      subject: "Constituent message",
      userId: "user-1"
    });

    assert.equal(cooldownStore.size, 0, "Preparing a draft must not create a local cooldown.");
    assert.equal(
      await contact.readMostRecentOfficialContact("A000001", "user:user-1", preparedCooldownKey),
      null,
      "An abandoned prepared draft must not block another attempt."
    );

    const confirmed = await contact.confirmOfficialContactForUser(prepared.id, "user-1");
    assert.equal(confirmed?.deliveryStatus, "sent", "User confirmation must mark the prepared record sent.");
    const confirmedCooldown = await contact.readMostRecentOfficialContact("A000001", "user:user-1", preparedCooldownKey);
    assert.equal(typeof confirmedCooldown, "number", "User confirmation must start the cooldown.");

    await contact.recordOfficialContact({
      contactUrl: "https://example.house.gov/contact",
      cooldownKey: preparedCooldownKey,
      deliveryMode: "manual",
      deliveryStatus: "prepared",
      memberBioguideId: "A000001",
      memberChamber: "House",
      memberName: "Example Representative",
      memberState: "CA",
      message: "This second draft is not sent.",
      senderEmail: "person@example.com",
      senderKey: "user:user-1",
      subject: "Second constituent message",
      userId: "user-1"
    });
    assert.equal(
      await contact.readMostRecentOfficialContact("A000001", "user:user-1", preparedCooldownKey),
      confirmedCooldown,
      "A later prepared draft must not replace the confirmed-sent cooldown timestamp."
    );

    const webhookCooldownKey = contact.cooldownKeyFor("B000002", "user:user-2");
    await contact.recordOfficialContact({
      contactUrl: "https://example.senate.gov/contact",
      cooldownKey: webhookCooldownKey,
      deliveryMode: "webhook",
      deliveryStatus: "sent",
      memberBioguideId: "B000002",
      memberChamber: "Senate",
      memberName: "Example Senator",
      memberState: "WA",
      message: "This message was confirmed by the delivery webhook.",
      senderEmail: "second@example.com",
      senderKey: "user:user-2",
      subject: "Constituent message",
      userId: "user-2"
    });
    assert.equal(
      typeof (await contact.readMostRecentOfficialContact("B000002", "user:user-2", webhookCooldownKey)),
      "number",
      "Webhook-confirmed delivery must start the cooldown immediately."
    );
  } finally {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  }
}

async function main() {
  await checkSourceContract();
  await checkLocalCooldownContract();
  console.log("Official-contact truth checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
