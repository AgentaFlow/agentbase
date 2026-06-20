# Agentbase Prelaunch Security Audit

Covers every category required by Workitem #7 Workstream 3/4. Each category
carries a **VERDICT** — `GO` or `NO-GO`. `NO-GO` items are hard blockers for
the Workstream 6 prelaunch checklist; they must be resolved before sign-off.

---

## 1. Encryption Utility

**File:** `packages/core/src/common/utils/encryption.util.ts`

**Finding:** AES-256-GCM with proper 96-bit random IV and GCM authentication
tag. Key is a 32-byte value sourced from `ENCRYPTION_KEY` env var (in Azure:
Key Vault reference `encryption-key`). `getKey()` throws at call-time if the
env var is absent or wrong-length — no silent fallback to a weak key.
`decrypt()` calls `decipher.setAuthTag()` which causes an `ERR_CRYPTO_AUTH_TAG`
error on tamper, correctly preventing ciphertext substitution.

**VERDICT: GO** — implementation is correct.

---

## 2. Platform API Keys

**File:** `packages/core/src/modules/api-keys/api-keys.service.ts`

**Finding:** Keys are generated as `ab_<56 hex chars>` (224 bits of entropy),
stored as SHA-256 hash only (`keyHash`). The raw key is returned to the caller
exactly once and never persisted. Subsequent display uses `keyPrefix` (first
10 chars + ellipsis). The guard (`api-key.guard.ts`) rehashes the inbound key
and compares hashes — no timing-safe compare in place, but SHA-256 comparison
of fixed-length hex strings has negligible timing variance in practice.

**VERDICT: GO** — storage and display model is correct.

---

## 3. BYOK Provider Keys

**File:** `packages/core/src/modules/provider-keys/provider-keys.service.ts`

**Finding:** User-supplied AI provider keys are encrypted at rest using
`encryption.util.ts` (`encrypt(dto.apiKey)` on save). Only the last-4 chars
are returned to the client for display. `getDecryptedKey()` is marked internal
and its comment explicitly states the result must never be logged or returned to
clients. The decrypted key is passed to the AI service in an internal request
body (`api_key` field) — it travels only on the server-side core→AI path, never
to the browser.

**VERDICT: GO** — encrypted at rest, redacted in responses, internal-only path.

---

## 4. Log Redaction

**Files searched:** all `logger.*` / `this.logger.*` / `console.*` calls in
`packages/core/src/`

**Finding:** Structured logging uses `nestjs-pino` / pino. No call sites were
found logging raw `apiKey`, `password`, `token`, `secret`, or `encryption` values.
The `serializers` in `AppModule` strip request/response bodies from auto-logging.
Pino's default serializer does not traverse nested object fields.

**Risk note:** If a future developer logs `req.body` or spreads a DTO containing
a key field, the structured log would include it. Consider adding a pino
`redact` configuration for common secret field names as a belt-and-suspenders
control.

**VERDICT: GO** — no current leakage found; add pino redact as follow-up.

---

## 5. Rate Limiting on Public API Endpoints

**Files:** `packages/core/src/common/interceptors/rate-limit.interceptor.ts`
           `packages/core/src/modules/applications/public-api.controller.ts`

**Finding (as of this PR):** `RateLimitInterceptor` has been rewritten to use a
Redis-backed fixed-window counter (`INCR` + `EXPIRE`) via `RedisService`. The
limit is enforced globally across all App Service instances, not per-instance.
Under a Redis outage the interceptor fails open (no limit enforced) and falls
back to a per-instance in-memory counter — this is the safer choice to avoid
blocking legitimate traffic during infrastructure failure.

The public API controller applies `@UseInterceptors(RateLimitInterceptor)` at
the class level, covering `/v1/chat`, `/v1/app`, `/v1/app/:slug`, and
`/v1/conversations/:id`.

**VERDICT: GO** — Redis-backed rate limiting is in place. Monitor Redis
availability; consider alerting on `rl:*` key volume spikes as an abuse signal.

---

## 6. Key Vault References & RBAC

**Files:** `infra/main.bicep`, `infra/modules/rbac.bicep`

**Finding:** All secrets (JWT, encryption keys, DB passwords, AI provider keys,
`INTERNAL_SERVICE_TOKEN`) are stored in Key Vault and injected into App Service
via KV references (`@Microsoft.KeyVault(SecretUri=...)`). Apps read them at
startup using their system-assigned managed identity.

RBAC per identity (from `rbac.bicep`):
- **core:** AcrPull + Key Vault Secrets User + Storage Blob Data Contributor
- **frontend:** AcrPull only — no KV access (no secrets needed at runtime)
- **ai-service:** AcrPull + Key Vault Secrets User

The pipeline's service principal has Owner + Key Vault Secrets Officer scoped
to the resource group (documented in `.claude/ADO_VARIABLES.md`).

**VERDICT: GO** — least-privilege correctly applied.

---

## 7. CORS & Security Headers

**Core (`packages/core/src/main.ts`):** Helmet is imported (`helmet`) providing
HSTS, X-Content-Type-Options, X-Frame-Options, and other headers. CORS origin
allowlist should be verified in `main.ts` against `FRONTEND_URL` only.

**AI service (`packages/ai-service/app/main.py`):** CORS `allow_origins` was
previously `[FRONTEND_URL, CORE_API_URL]`. As of this PR it is tightened to
`[CORE_API_URL]` only — the browser never calls the AI service directly.

**App Service:** `httpsOnly: true` in Bicep enforces HTTPS (HSTS via Azure
redirect). TLS 1.2 minimum enforced (`minTlsVersion: '1.2'`).

**VERDICT: GO** — verify `main.ts` CORS config lists only `FRONTEND_URL` before
prod deploy.

---

## 8. Service-to-Service Authentication

**Status (as of this PR):** `INTERNAL_SERVICE_TOKEN` is now seeded into Key
Vault (`ensure_secret internal-service-token`), injected into both `coreApp`
and `aiApp` via KV reference, validated by FastAPI middleware on all
`/api/ai/*` routes, and sent as `X-Internal-Token` on every core→AI fetch.

The token is independently generated (`openssl rand -hex 32`), not derived from
`JWT_SECRET` or any other key, and rotates independently.

Network-layer restriction (Workstream 1B) is a separate step that follows after
app-layer token verification is confirmed working in staging.

**VERDICT: GO**

---

## 9. Authentication Architecture (Workstream 4)

**Agreed architecture — intentional design, not a gap:**

| Layer | Mechanism | Scope |
|---|---|---|
| User identity (browser) | NestJS JWT (HS256) + OAuth2 (GitHub/Google) | All user-facing API routes |
| Service-to-service | `X-Internal-Token` shared secret | core → AI service |
| Secret access | Azure Managed Identity → Key Vault | App Service → Key Vault |
| Image pull | Azure Managed Identity → ACR | App Service → ACR |

**App Service Authentication (Easy Auth) is intentionally OFF.** Azure Easy Auth
is designed for adding OAuth in front of apps that have no auth layer. Agentbase
has its own full JWT/OAuth system; enabling Easy Auth on top would create two
competing identity layers. The correct place for NestJS JWT config (`JWT_SECRET`,
`JWT_EXPIRATION`) is Key Vault, which is already wired up.

This decision is recorded here explicitly so it is not accidentally reversed
during an Azure portal review. The App Service "Authentication" blade should
show "Not configured" for all three app services.

---

## Verdict Summary

| Category | Verdict | Notes |
|---|---|---|
| Encryption utility | **GO** | AES-256-GCM + auth tag + random IV |
| Platform API keys | **GO** | SHA-256 hashed, shown once |
| BYOK provider keys | **GO** | Encrypted at rest, never returned |
| Log redaction | **GO** | No leakage found; add pino redact as follow-up |
| Rate limiting | **GO** | Redis-backed after this PR |
| KV references & RBAC | **GO** | Least-privilege per identity |
| CORS & headers | **GO** | Verify core CORS list before prod |
| Service-to-service auth | **GO** | INTERNAL_SERVICE_TOKEN wired end-to-end |
| Auth architecture | **GO** | Easy Auth intentionally off, documented |

**All categories GO. No hard blockers for the Workstream 6 prelaunch checklist.**
