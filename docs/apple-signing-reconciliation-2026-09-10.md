# CapitolWonk Apple Signing Reconciliation — September 10, 2026

## September 16 Apple Support call — interim guidance relayed by Tyler

Tyler reports that Apple Support said a revoked certificate cannot be made trusted again: a new certificate must be created in the developer account and the application package signed with the replacement. Support also sent Apple's general Keychain Access certificate-request guide. This is a Tyler-relayed summary, not a copied case transcript or evidence that a new certificate has been issued.

The guidance establishes a replacement principle for a genuinely revoked certificate. It does not yet identify the exact certificate type and owner, the revocation date or cause, whether a matching private key remains in the preserved prior Keychain, or whether the current cloud-managed Distribution certificate and App Store profile are affected. It does not distinguish local Development signing for device QA from cloud-managed Distribution signing through Xcode Organizer. Ask Apple to put the certificate-specific sequence and effect on existing assets in the same case before choosing one action. Do not infer that the July Keychain incident itself revoked a certificate.

Tyler supplied two Keychain Access photos on September 16. Both entries are **Apple Development** certificates in “My Certificates,” both show “certificate is not trusted,” and both have 2027 expiration dates. Follow-up read-only Keychain Access inspection showed that both are in the login Keychain with a private key nested beneath each, and both trust panels say **Use System Defaults**. Apple's Certificate Assistant, set to **Code Signing** policy, evaluated each certificate as **Success / Good** and “This certificate is valid,” with a chain through Apple Worldwide Developer Relations G3 to Apple Root CA. This conflicts with the red Keychain Access summary. It does not establish the Apple Developer portal's revocation status or prove that Xcode can use either key to sign.

A fresh read-only `security find-identity -p codesigning` check reported **0 identities found** and **0 valid identities found**, while `security find-certificate` saw no certificates in the login Keychain from this command environment. Because Keychain Access visibly shows the two certificates and private keys in login, the command-line results are not reliable evidence of their absence; the cause of that visibility discrepancy remains unknown. Neither account recovery nor the local warning alone establishes that either certificate or Apple account was revoked. Do not override trust settings or issue replacements based on the local warning alone; check the exact portal status and Xcode's account/certificate view first.

The signed-in Apple Developer portal was inspected read-only after the Support call ended. In the currently selected team, the certificate list contains one Development certificate matching the name-labeled Keychain entry's expiration date and one Distribution Managed certificate. The Development certificate has a detail page with a Revoke action, so it is still present as an active certificate in that team; no revocation action was taken. The email-labeled Keychain certificate does not appear in that team's list, and its portal status under any other account or team remains unverified. The project's Xcode configuration uses automatic signing, has a development team, and does not pin a provisioning-profile specifier or signing identity. Xcode's account view repeatedly timed out during read-only UI inspection, so Xcode signing usability also remains unverified.

Tyler subsequently reported that the other account's certificates do not seem to appear. The Safari Developer page available to Codex still displays the name-labeled team, so the reported other-account view has not been independently inspected. Apple documents that a free Personal Team's certificates and profiles are managed directly in Xcode rather than through the Developer Program portal; this is a possible explanation if the other account is a Personal Team, not evidence of its actual membership or certificate status. See [Apple's developer account overview](https://developer.apple.com/help/account/basics/about-your-developer-account). Xcode's UI continued to time out on a renewed read-only attempt.

No CSR, certificate, private key, Keychain, profile, Xcode signing setting, signed package, upload, or distribution change was reported to or performed by Codex in this continuation. A replacement Apple Development identity can be created for the team if portal revocation or an unusable key is confirmed, but the successful Code Signing evaluations make immediate replacement premature. The existing Distribution Managed certificate and App Store profile have not been shown to need replacement. T04 remains blocked on a reviewed exact path and Tyler's action-time approval. The September 12 status and investigation below are historical where they say Apple has not replied.

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

Take no signing or provisioning action now. The Support call has ended. Read-only next step: determine the email-labeled certificate's status in its own developer team, then reconcile Xcode's signing identity view with Certificate Assistant's successful Code Signing evaluations, the current team's active Development certificate, and the command-line visibility discrepancy. Present Tyler one narrowly scoped action for explicit approval only if a change is needed. If no substantive certificate-specific guidance exists at the **September 17 slip trigger**, prepare one sanitized same-case escalation plus its effect on the September 25 readiness checkpoint and October 19 submission target for Tyler's explicit approval. Do not send it or create a duplicate case automatically.

## Workspace-integrity resolution

The worktree and remote branch matched at documentation commit `2443c08` before T04 began. During the read-only pass, an unexplained uncommitted `pnpm-lock.yaml` diff appeared without a `package.json` change. It downgraded several transitives patched by T03 and would have changed the accepted dependency graph. The diff was not staged, committed or pushed; remote dependency candidate `f4f04de` and its recorded evidence remained unchanged.

The diff was quarantined without running an install or build. Tyler explicitly approved restoring only `pnpm-lock.yaml` to the committed T03 version and pushing the T04 documentation checkpoint. The restored file matches the committed lockfile; no dependency change was staged, committed or pushed.
