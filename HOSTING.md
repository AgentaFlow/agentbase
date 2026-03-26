# Self-Hosting Agentbase with Marketplace Integration

This document is intended for **hosting partners** and self-hosters who want to connect their Agentbase installation to the official Agentbase Marketplace, a private marketplace, or no marketplace at all.

---

## Overview

Agentbase ships with the marketplace feature **off by default**. The `MARKETPLACE_URL` environment variable controls which marketplace instance (if any) the platform connects to.

| Scenario                                 | `MARKETPLACE_URL` value                   |
| ---------------------------------------- | ----------------------------------------- |
| No marketplace (air-gapped / local only) | _(unset or empty)_                        |
| Official Agentbase Marketplace           | `https://marketplace.agentbase.dev`       |
| Your own private marketplace             | `https://marketplace.yourcompany.example` |

---

## Configuration

### 1. Set the environment variable

In your `packages/core/.env` (or injected via your container orchestrator / secret manager):

```env
MARKETPLACE_URL=https://marketplace.agentbase.dev
```

For a **private marketplace**, replace the URL with your own:

```env
MARKETPLACE_URL=https://marketplace.yourcompany.example
```

Leave the variable **unset** to disable all marketplace features:

```env
# MARKETPLACE_URL=
```

### 2. Optional: Instance identity

Each Agentbase instance generates a unique `AGENTBASE_INSTANCE_ID` on first boot and stores it in the database. You can pre-seed it for reproducible deployments:

```env
AGENTBASE_INSTANCE_ID=your-stable-uuid-here
```

This value is hashed together with your domain and sent to the marketplace during ping/registration requests.

---

## What the `MARKETPLACE_URL` controls

When set, the open-source platform will:

1. **Browse catalog** — Fetch the public plugin and theme catalog from `{MARKETPLACE_URL}/api/v1/catalog`.
2. **Install plugins and themes** — POST to `{MARKETPLACE_URL}/api/v1/installations/register` on install.
3. **Validate licenses** — Call `{MARKETPLACE_URL}/api/v1/licenses/validate` for paid plugins (with a 5-minute local cache and a 7-day offline grace period).
4. **Ping for updates** — POST to `{MARKETPLACE_URL}/api/v1/installations/ping` daily to check for new versions.
5. **Download updates** — Fetch signed download URLs from `{MARKETPLACE_URL}/api/v1/packages/:id/download`.

When `MARKETPLACE_URL` is unset, all of the above calls are silently skipped and no external requests are made.

---

## Partner Program

If you are offering Agentbase as a hosted service, you may be eligible for the **Agentbase Partner Program**:

- **Hosting partners** who display the "Powered by Agentbase" badge and register their installation with the official marketplace receive co-marketing benefits.
- Partners agree to the [Trademark License Agreement](https://marketplace.agentbase.dev/legal/trademark-license) and may not represent their service as the official Agentbase platform without written authorisation.
- To apply, contact **partners@agentbase.dev** or use the partner onboarding form in your marketplace admin panel.

### Badge Verification

The official marketplace exposes a public badge verification endpoint:

```
GET https://marketplace.agentbase.dev/api/v1/partner/verify-badge?installationId={instanceId}
```

This endpoint returns `{ "valid": true, "domain": "yoursite.example", "since": "2026-01-01T00:00:00.000Z" }` when the installation is registered. Embed this in your footer badge or use it in automated compliance checks.

---

## Security Considerations

- **Never** share your `MARKETPLACE_INTERNAL_HMAC_SECRET` (used only by the marketplace backend for ping HMAC validation). This is unrelated to the `MARKETPLACE_URL` override.
- Ping requests to the marketplace include only your hashed `instanceId`, domain, installed plugin IDs, and version strings — no user data is transmitted.
- License validation responses are cached locally for 5 minutes; the marketplace server never learns which exact user triggered a validation.

---

## Private Marketplace Hosting

If you run your own private instance of `agentbase-marketplace` (available to Enterprise licensees), set `MARKETPLACE_URL` to your private instance URL. No other configuration changes are required in the open-source platform.

Refer to the [agentbase-marketplace README](https://github.com/AgentaFlow/agentbase-marketplace/blob/main/README.md) for self-hosting instructions for the private marketplace service.

---

## Support

| Channel           | Link                                           |
| ----------------- | ---------------------------------------------- |
| Documentation     | https://docs.agentbase.dev/self-hosting        |
| Partner enquiries | partners@agentbase.dev                         |
| Community forum   | https://community.agentbase.dev                |
| GitHub Issues     | https://github.com/AgentaFlow/agentbase/issues |
