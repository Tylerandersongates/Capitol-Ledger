# CapitolWonk Custom-Domain Cutover — September 14, 2026

Status: **complete and publicly verified.** `capitolwonk.com` is attached to the `project-qosv1` Vercel project as the redirecting apex, and `www.capitolwonk.com` is the canonical application host.

## Applied DNS boundary

Only the two web-hosting records changed in Porkbun:

| Host | Type | Value | Purpose |
| --- | --- | --- | --- |
| `capitolwonk.com` | `A` | `216.150.1.1` | Vercel apex routing and redirect |
| `www.capitolwonk.com` | `CNAME` | `d1fcda42e4ee2f20.vercel-dns-017.com` | Canonical Vercel application host |

The existing wildcard CNAME remains in place for unrelated unmatched subdomains. The `send` and `rsend` CNAMEs, both Porkbun forwarding MX records, SPF, DKIM, DMARC, and ACME challenge records were not edited or removed.

## Public verification

- Public DNS returned the exact Vercel apex A record and `www` CNAME above.
- Public DNS continued to return `fwd1.porkbun.com` at priority 10, `fwd2.porkbun.com` at priority 20, and the existing Porkbun SPF record.
- `https://capitolwonk.com/` returned an HTTPS `308` redirect to `https://www.capitolwonk.com/`.
- `https://www.capitolwonk.com/` returned the application's expected `307` sign-in redirect.
- Following the apex redirect returned HTTP `200` for `/privacy`, `/privacy/request`, `/brief`, and `/support` on `www.capitolwonk.com`.
- `GET https://www.capitolwonk.com/api/privacy/requests` returned HTTP `503`, `cache-control: no-store`, and `PRIVACY_REQUEST_INTAKE_DISABLED`, confirming the custom domain did not activate intake.

No source release, environment-variable change, mail delivery exercise, provider message, privacy activation, deletion/retention run, App Store action, or other DNS record change was part of this cutover.
