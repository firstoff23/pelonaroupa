# Security Policy — Pawra

## Supported Versions

Only the latest version of Pawra is actively maintained and receives security updates.

| Version | Supported          |
| ------- | ------------------ |
| latest  | ✅ |
| older   | ❌ |

---

## Security Controls

The following security controls are implemented and active in production:

### Authentication & Sessions
- **Supabase Auth** — JWT tokens with automatic refresh via `onAuthStateChange(TOKEN_REFRESHED)`
- **HTTP-only session cookies** — `HttpOnly; SameSite=Strict; Secure` on the Node.js gateway layer
- **MFA / TOTP** — Two-factor authentication (RFC 6238) compatible with Google Authenticator and Authy. Secrets are stored server-side in `users.mfa_secret`, validated with HMAC-SHA1 and a ±90s window
- **Leaked Password Protection (HaveIBeenPwned k-anonymity)** — Active verification against known public data breaches via `server/security/check-password-pwned.ts`. The full password never leaves the server; only a 5-character SHA-1 prefix is sent with `Add-Padding: true` and 3s timeout fail-open. Enforced on account registration and password reset.

### Brute-Force & Rate Limiting
- **slowapi** on the FastAPI backend: 3 requests / 15 min per IP on the `/classify` endpoint
- **tRPC-level rate limiting** via `checkRateLimit()` per procedure

### Transport & Headers
- **Content Security Policy** (CSP): `script-src`, `style-src`, `img-src`, `connect-src`, `media-src`, `frame-ancestors 'none'`
- **HTTPS enforced** on all production deployments (Vercel + Fly.io + Hugging Face Spaces)
- **CORS**: explicit origin allow-list on the Node.js gateway

### Input Validation
- All tRPC procedure inputs validated with `zod` schemas (strict shapes, enums, length limits)
- File uploads validated by MIME type allow-list before ML processing

### Audit Logging
- `audit_logs` table in Supabase records `user_id`, `action`, `resource_type`, `resource_id`, `ip_address`, `created_at`
- `AuditLogMiddleware` in FastAPI automatically logs all `POST`, `PUT`, `DELETE` requests

### Circuit Breaker & Resilience
- React Query `QueryClient` configured with `retry: 3` and exponential backoff (`1s → 2s → 4s`)
- Global `ErrorBoundary` (`GlobalFallback.tsx`) catches uncaught React render errors

---

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please report security issues responsibly via one of:

1. **[GitHub Security Advisory](https://github.com/firstoff23/AnimalMind/security/advisories/new)** — private disclosure
2. **Direct contact**: [@firstoff23](https://github.com/firstoff23) on GitHub

### What to include

- Clear description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Optional: suggested fix or patch

### Response Timeline

| Stage | Target |
|---|---|
| Acknowledgement | Within 48 hours |
| Initial assessment | Within 5 business days |
| Fix & disclosure | As soon as possible after validation |

---

## Supabase Linter Advisors & Accepted Risks

### ⚠️ `auth_leaked_password_protection` — Compensating Control Active
- **Linter Finding:** `auth_leaked_password_protection` (WARN).
- **Context:** The native Supabase Auth password leak check toggle is locked behind the paid Supabase Pro+ plan.
- **Compensating Control:** Implemented an in-house verification service in `server/security/check-password-pwned.ts` using the official **HaveIBeenPwned API (k-anonymity model)**.
  - Generates SHA-1 hash locally.
  - Sends only the 5-character prefix to `https://api.pwnedpasswords.com/range/{prefix}` with `Add-Padding: true` to prevent response length side-channel attacks.
  - Matches the remaining 35-character suffix locally on the server.
  - Enforced before user signup (`RegisterPage.tsx`) and password reset (`ResetPasswordPage.tsx`).
  - Employs an in-memory TTL prefix cache and a 3-second fail-open timeout for resilient UX.
- **Audit Note:** The Supabase Database Advisor only checks the cloud dashboard setting flag, so this finding may remain visible in the dashboard until upgraded to Pro+. The compensating control fully satisfies the security requirement.

---

## Scope

This policy applies to the Pawra application, including:

- **Node.js gateway** (Express + tRPC + Vercel Functions)
- **React PWA client** (Vite + Wouter + React Query)
- **FastAPI ML backend** (Python, YAMNet/YOLOv8)
- **Database** (Supabase PostgreSQL + Storage)

## Out of Scope

- Third-party services (Supabase, Vercel, Hugging Face) — report those directly to the respective provider
- Issues in development/test environments with no production impact

---

Thank you for helping keep Pawra and its users safe. 🐾
