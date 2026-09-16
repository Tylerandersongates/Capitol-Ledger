# CapitolWonk Apple Signing Reconciliation — September 10, 2026

## September 16 Apple Support call — interim guidance relayed by Tyler

Tyler reports that Apple Support said a revoked certificate cannot be made trusted again: a new certificate must be created in the developer account and the application package signed with the replacement. Support also sent Apple's general Keychain Access certificate-request guide. This is a Tyler-relayed summary, not a copied case transcript or evidence that a new certificate has been issued.

The guidance establishes a replacement principle for a genuinely revoked certificate. It does not yet identify the exact certificate type and owner, the revocation date or cause, whether a matching private key remains in the preserved prior Keychain, or whether the current cloud-managed Distribution certificate and App Store profile are affected. It does not distinguish local Development signing for device QA from cloud-managed Distribution signing through Xcode Organizer. Ask Apple to put the certificate-specific sequence and effect on existing assets in the same case before choosing one action. Do not infer that the July Keychain incident itself revoked a certificate.

Tyler supplied two Keychain Access photos on September 16. Both entries are **Apple Development** certificates in “My Certificates,” both show “certificate is not trusted,” and both have 2027 expiration dates. The photos do not show the detailed Code Signing evaluation reason, the Apple Developer portal status, or usable private-key access. A fresh read-only `security find-identity -p codesigning` check reported **0 identities found** and **0 valid identities found**. This local evidence does not establish that either certificate or Apple account was revoked. Account recovery or a new login Keychain could affect local access to a private key, but that cause is unconfirmed. Do not override trust settings; first have Apple confirm the exact certificate status in the Developer portal and evaluate the local chain and private-key availability.

No CSR, certificate, private key, Keychain, profile, Xcode signing setting, signed package, upload, or distribution change was reported to or performed by Codex in this continuation. A replacement Apple Development identity can be created for the team if Apple confirms revocation or an unrecoverable key, but a new leaf certificate would not repair a broken local trust chain. The existing Distribution Managed certificate and App Store profile have not been shown to need replacement. T04 remains blocked on a reviewed exact path and Tyler's action-time approval. The September 12 status and investigation below are historical where they say Apple has not replied.

## Decision

**T04 remains active and blocked pending Apple Developer Support guidance as of September 12.** The current read-only signing evidence still records zero usable code-signing identities. One current Xcode-managed App Store provisioning profile exists and matches the project, but a profile alone cannot sign without a usable matching certificate/private-key identity.

Tyler confirmed that Apple had not replied. The existing open Support case was located in the authenticated Apple Developer portal. After reviewing the exact sanitized correction, Tyler explicitly approved adding the private case ID and sending the message on that existing case. Apple displayed its receipt confirmation. The case ID and all Apple account, team, bundle, certificate, profile and device identifiers are intentionally omitted from repository documentation.

No certificate, CSR, private key, Keychain, profile, Xcode signing setting, Apple account, device trust/pairing, archive, upload or distribution state changed.

## September 12 Reply Recheck

The authenticated mailbox was inspected read-only. The newest Apple Developer Support message remains the September 10 receipt acknowledgment; no later substantive guidance was present. No message was sent, no case was created or changed, and no private case/account value was copied into this repository.

## Current read-only evidence

- `security find-identity -p codesigning` completed normally and reported **0 identities found** and **0 valid identities found**.
- The legacy MobileDevice provisioning-profile directory is absent. Xcode's current UserData provisioning-profile directory contains one profile.
- The sole profile is Xcode-managed, App Store class, matches the project's single configured bundle value by boolean-only comparison, was created July 15, 2026, expires July 15, 2027, is not expired, supports iOS/xrOS/visionOS and embeds one developer certificate.
- OpenSSL parsed and verified the profile's signed CMS container with chain trust intentionally skipped. This establishes structural integrity only; it does not validate certificate-chain trust or revocation.
- Stable Xcode 26.6 build `17F113` remains selected at `/Applications/Xcode.app/Contents/Developer`. Xcode 27.0 beta build `27A5228h` remains installed side by side and is not selected.
- Xcode remembers one paired physical iPhone record with Developer Mode enabled and local-network transport, but `devicectl` reports it disconnected. A direct available-device query returned zero physical mobile devices. `xctrace` lists the remembered record, not a currently available device.
- The Apple Developer portal shows one open Certificates, Identifiers, and Provisioning Profiles case and contact-history entries dated July 30, August 13 and September 2. Tyler confirmed there was no Support reply. The portal offered email follow-up on the same case.
- The approved correction states that the revoked Development certificate's individual owner is unconfirmed; routing and Xcode/Keychain labels are not ownership proof. It asks Apple to identify the owner and provide the supported path to a usable local signing identity without resetting the login Keychain or changing the existing Distribution Managed certificate. It also reports the zero-identity result and the current matching App Store profile. Apple confirmed receipt.

## Interpretation

- The provisioning-profile absence recorded during the July signed attempt is no longer the immediate observable blocker: a current matching App Store profile is present.
- Certificate-based/App Store signing remains blocked because macOS has no usable certificate/private-key identity. The profile's embedded certificate does not change that result.
- The July connected-device state is no longer current. Device availability must be re-established after signing health and before T06 app-level QA; it does not justify a signing or pairing change now.
- T04 cannot close from profile presence or a remembered device record. Apple guidance or another approved, evidence-backed signing path is still required before a signed Release archive attempt.

## Preserved freeze

Until Apple replies and Tyler approves one exact action, do not:

- revoke, create, download, import or export a certificate;
- create another CSR or delete/reset a private key or Keychain;
- regenerate or delete a provisioning profile;
- change team, bundle, capability, account or Xcode signing settings;
- pair, trust or change Developer Mode/device state;
- run a signed archive, upload or distribution action.

## Exact next action

Take no signing or provisioning action now. During the current Apple Support call, ask Apple to confirm whether each exact Apple Development certificate is revoked in the Developer portal or merely fails local trust evaluation, and to identify the Code Signing evaluation reason, WWDR chain state, and matching private-key availability. Record only a redacted technical summary, reconcile it with the zero-identity/current-profile evidence, and present Tyler one narrowly scoped action for explicit approval. If no substantive certificate-specific guidance exists at the **September 17 slip trigger**, prepare one sanitized same-case escalation plus its effect on the September 25 readiness checkpoint and October 19 submission target for Tyler's explicit approval. Do not send it or create a duplicate case automatically.

## Workspace-integrity resolution

The worktree and remote branch matched at documentation commit `2443c08` before T04 began. During the read-only pass, an unexplained uncommitted `pnpm-lock.yaml` diff appeared without a `package.json` change. It downgraded several transitives patched by T03 and would have changed the accepted dependency graph. The diff was not staged, committed or pushed; remote dependency candidate `f4f04de` and its recorded evidence remained unchanged.

The diff was quarantined without running an install or build. Tyler explicitly approved restoring only `pnpm-lock.yaml` to the committed T03 version and pushing the T04 documentation checkpoint. The restored file matches the committed lockfile; no dependency change was staged, committed or pushed.
