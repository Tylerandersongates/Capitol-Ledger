# Neon Owner Credential Containment — September 15, 2026

Status: **containment complete. Tyler reset the protected production `neondb_owner` password in Neon on September 15, 2026. The replacement value was not disclosed to Codex or recorded here.**

## What happened

During preparation for the separately approved, read-only principal-ACL catalog inventory, the current Neon owner connection credential was exposed in local terminal output. The credential value is intentionally omitted from this record and must not be reused, copied into a task, or committed anywhere.

The catalog inventory did **not** run. The attempted passwordless connection reached the wrong/default database and stopped at the exact-target guard. The later direct-client attempt did not establish a database session. No catalog ACL query or mutation ran, no catalog result was obtained, and no production migration, role, ACL, schema, application row, provider, or gate was changed.

## Containment completed

- Stopped the waiting client session.
- Permanently removed the temporary client/tooling directory and verified that it was absent.
- Cleared the browser clipboard.
- Inspected three Vercel project surfaces read-only: project Environment Variables, linked Shared Environment Variables, and connected Storage/database resources. Those surfaces showed no configured `DATABASE_URL`, linked shared variable, or connected Vercel database resource. This does not prove that no external or unlisted client uses the old credential.
- Retired the principal-ACL inventory from the launch-critical path. Do not retry it from this checkpoint.

## Credential reset completed

Tyler directly completed the `neondb_owner` password reset for the protected production branch in Neon. Neon displayed a success confirmation with the replacement masked. The replacement was not read, copied, pasted, logged, downloaded, or recorded by Codex.

New connections using the exposed credential will fail. Known Vercel project surfaces did not show a runtime dependency on that credential, but any unknown external client that used it would need an independently approved update.

## Launch-scope decision

The first-party privacy operator/ACL/migration/role sequence is conditional post-launch work unless Tyler explicitly reselects it for the October 30 launch. The configured dedicated privacy mailbox is the launch intake channel. Keep first-party intake, operations, monitoring, retention, deletion, the service adapter, and all database-backed operator gates off.
