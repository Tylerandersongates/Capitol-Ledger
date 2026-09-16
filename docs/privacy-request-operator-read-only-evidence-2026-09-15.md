# Privacy-request operator read-only evidence — September 15, 2026

Status: **table identity and recorded migration-name set confirmed in Neon production UI; principal-level ACL dependency read prepared but not executed.** No database row was changed, no application table row was opened, and no privacy/App Store processing gate changed. This follows the [failed-preflight remediation review](privacy-request-operator-ambient-privilege-remediation-review-2026-09-15.md); it does not authorize a migration, `PUBLIC` ACL change, role, credential, or operator binding.

## Confirmed table and migration metadata

Neon Console showed project `CapitolWonk`, default/protected branch `production` (`br-royal-credit-ak0vykl9`), and the exact retained database label `Capitol%20Ledger`. In the selected database's `public` table inventory, `PrivacyRequest` was present. An exact table-name search for `PrivacyRequestOperation` returned **No tables found**. The earlier aggregate's unnamed one-of-two missing-table condition is therefore resolved to the operations table by this separate UI evidence.

Only `_prisma_migrations` metadata was opened. Its table view showed 18 history rows and 17 distinct recorded migration names. Those names matched all 17 checked-in migrations preceding `20260914150000_privacy_request_operations`; the operations migration name had no history row, and there was no unexpected recorded name. The privacy-intake migration was recorded. One duplicate name belongs to the previously documented rolled-back/retried historical migration; this UI read did not independently inspect `rolled_back_at`, stored checksums against source files, unresolved failures, or concurrent schema activity. It therefore identifies the likely sole pending repository migration **by name comparison**, but it is not a production migration preflight or write approval.

The UI exposed migration IDs/checksums during inspection; this packet retains neither those values nor error logs. No customer/application rows were inspected.

## Principal and connection evidence still open

Neon's protected-branch Roles page showed one managed role, `neondb_owner`, owning `neondb` and the retained application database. That UI list does not prove the complete PostgreSQL login-role inventory, effective direct/inherited grants, or which principal Vercel uses at runtime. The earlier approved aggregate proved `PUBLIC` database `CONNECT` and `TEMPORARY` are present, but did not identify any dependency on them.

The SQL Editor was set to primary endpoint `ep-dry-thunder-aktc1o54` and selected database label `Capitol%20Ledger`. A single `SELECT` comparing `current_database()` to that literal was submitted after the protected-branch warning, but **failed before SQL execution**: the editor reported that database `Capitol Ledger` does not exist. The editor double-decoded the selected literal percent sequence, as in the previous preflight attempt. Do not change the target to the deleted spaced-name database or infer ACL results from this failure.

The [guarded catalog-only ACL inventory candidate](privacy-request-operator-principal-acl-inventory-2026-09-15.sql), SHA-256 `3ee6b66c7f4efe34ae52698bf13453aaf81bb118785f0e51cd61250a54cd21b8`, is source-only and unexecuted. It requires an explicit read-only transaction, action-time session marker, and exact literal-database guard before reading `pg_database` ACL and `pg_roles`/role-membership privilege paths. It returns one bounded aggregate with at most 32 login-role summaries (names and privilege booleans only), no password, grantor, application row, or credential. Even if it runs, the Vercel runtime role still needs independent identification; no live Vercel binding was inspected under this checkpoint.

Next: separately confirm the direct-client/credential-handling method for this exact read and the scope of any private Vercel runtime-role inspection. Keep the `PUBLIC` ACL and operations migration untouched until a complete dependency map and distinct action approvals exist. A new guarded ambient preflight remains required after any separately approved remediation.
