# `agentbase-deploy.yml` — Pipeline Runbook

How to set up, run, roll back, and tear down the Agentbase Azure deployment.
Pipeline: [`azure-pipelines/agentbase-deploy.yml`](../../azure-pipelines/agentbase-deploy.yml)
· Stage template: [`templates/deploy-env.yml`](../../azure-pipelines/templates/deploy-env.yml)

---

## 1. One-time setup

These prerequisites are created **once** in Azure DevOps + Azure. They are
intentionally **not** provisioned by the pipeline (the pipeline needs them to
exist in order to authenticate).

### 1.1 Resource groups

```bash
az group create -n rg-agentbase-staging -l eastus
az group create -n rg-agentbase-prod    -l eastus
```

### 1.2 Service connections

Create **two** Azure Resource Manager service connections (Project Settings →
Service connections), one per environment. Scope each to its resource group only
(not the whole subscription) for least-privilege isolation.

| ADO variable | Connection name (example) | Scoped to |
|---|---|---|
| `AZURE_SERVICE_CONNECTION_STAGING` | `agentbase-staging-sc` | `RG_STAGING` |
| `AZURE_SERVICE_CONNECTION_PROD` | `agentbase-prod-sc` | `RG_PROD` |

Grant each service principal **two roles** on its resource group:
- **Owner** — required because `rbac.bicep` creates role assignments (Contributor
  alone can't grant roles; you need User Access Administrator, which Owner includes).
- **Key Vault Secrets Officer** (at RG scope, not KV resource scope) — data-plane
  secret writes. Scoped to the RG so the role inherits to the Key Vault once
  Bicep creates it on the first run (the KV doesn't exist yet when this is set up).

For the prod service connection: choose **"Specific pipelines"** rather than
"Grant access to all pipelines" in the security settings, and add only the
`agentbase-deploy.yml` pipeline.

### 1.3 Variable group

Create a variable group named **`agentbase-deploy-config`** (Pipelines →
Library) with:

| Variable | Secret? | Example / purpose |
|----------|:------:|-------------------|
| `AZURE_SERVICE_CONNECTION_STAGING` | no | `agentbase-staging-sc` |
| `AZURE_SERVICE_CONNECTION_PROD` | no | `agentbase-prod-sc` |
| `RG_STAGING` | no | `rg-agentbase-staging` |
| `RG_PROD` | no | `rg-agentbase-prod` |
| `PG_ADMIN_PASSWORD` | **yes** | PostgreSQL admin password (≥ 12 chars, complex) |
| `TEARDOWN_RESOURCE_GROUP` | no | RG the teardown stage deletes when enabled |
| `STRIPE_SECRET_KEY` | yes | *(optional)* payments |
| `STRIPE_WEBHOOK_SECRET` | yes | *(optional)* |
| `OPENAI_API_KEY` | yes | *(optional)* AI provider |
| `ANTHROPIC_API_KEY` | yes | *(optional)* |
| `GEMINI_API_KEY` | yes | *(optional)* |
| `HUGGINGFACE_API_KEY` | yes | *(optional)* |

Optional secrets left undefined are stored in Key Vault as `not-configured`
placeholders so their Key Vault references still resolve. `jwt-secret`,
`jwt-refresh-secret`, `encryption-key`, `plugin-settings-encryption-key`, and
`internal-service-token` are **generated once** by the seed script and preserved
across deploys — do not add these to the variable group.

### 1.4 Environments + approval gate

Create two **Environments** (Pipelines → Environments): `agentbase-staging` and
`agentbase-prod`. On **`agentbase-prod`**, add an **Approvals and checks →
Approvals** entry listing the approver(s). This is the manual production gate.

### 1.5 Register the pipeline

New pipeline → point at `azure-pipelines/agentbase-deploy.yml`. First run will
prompt to authorise the variable group and environments.

---

## 2. How a run works

```
Validate ─▶ Deploy·staging ─▶ (approval) ─▶ Deploy·prod
```

1. **Validate** (runs on PRs and `main`): `az bicep build`, `what-if` against
   staging, `pnpm` install/lint, core unit tests (with a throwaway Postgres
   container), frontend build, AI-service tests, `pnpm audit` + `pip-audit`.
2. **Deploy · staging** (auto): provisions infra, `az acr build` ×3, seeds Key
   Vault, sets container images + restarts, health-checks all three URLs.
3. **Approval**: the `agentbase-prod` environment check pauses for sign-off.
4. **Deploy · prod**: same sequence with prod parameters (private networking).

Each environment deploy is a single Azure DevOps **deployment job** so all steps
share the infra outputs (ACR name, app names, URLs) via job variables.

Trigger: pushes to `main` touching `infra/**`, `packages/**`, or
`azure-pipelines/**`. PRs run **Validate only** (deploy stages are skipped via
`condition: ne(variables['Build.Reason'], 'PullRequest')`).

---

## 3. Rollback

The plan is Basic/Standard tier (no deployment slots), so rollback = re-point an
app at the previous image tag (build IDs are the tags):

```bash
az webapp config container set \
  --name <appName> --resource-group <rg> \
  --container-image-name <acrLoginServer>/agentbase-core:<previousBuildId>
az webapp restart --name <appName> --resource-group <rg>
```

App names and the ACR login server are in the deployment outputs (Deploy stage
logs, step 1) or:

```bash
az deployment group show -g <rg> -n main --query properties.outputs
```

**Blue-green option:** move the plan to **S1+**, add a `staging` deployment slot
per app in `app-service-container.bicep`, deploy to the slot, health-check, then
`az webapp deployment slot swap`. This gives instant rollback by swapping back.

---

## 4. Teardown

The `Teardown` stage is disabled (`condition: false`). To remove an environment:

1. Set `TEARDOWN_RESOURCE_GROUP` in the variable group to the target RG.
2. Temporarily change the stage `condition` to `true` (or run the stage manually
   from a branch) and run the pipeline.

```bash
# equivalent manual command
az group delete --name rg-agentbase-staging --yes --no-wait
```

> Key Vault has **purge protection** enabled; a deleted vault is recoverable for
> 7 days and its name is reserved until purged. Use a fresh `uniqueSuffix` if you
> redeploy before purge completes.

---

## 5. Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| `seed-keyvault.sh` fails with a network/403 on **prod** | Prod Key Vault is private. Run the pipeline on a **self-hosted agent inside the VNet**, or temporarily add the agent's egress IP to the vault firewall, or seed secrets out-of-band. Staging (public KV) is unaffected. |
| App stuck "starting", `ImagePullFailure` | The `AcrPull` role assignment can lag on first deploy. Restart the app, or re-run the Deploy stage — role assignment is idempotent. |
| Core unhealthy, logs show Postgres TLS error | Ensure `POSTGRES_SSL=true` (set by Bicep) reached the app; confirm the app restarted after secrets were seeded. |
| Key Vault reference shows literal `@Microsoft.KeyVault(...)` | Secret not yet seeded when the app first evaluated settings. Re-run step 4 (restart) after seeding, or re-run the Deploy stage. |
| `what-if` / deploy fails creating role assignments | Service principal lacks **User Access Administrator**. Grant it on the RG. |
| Frontend calls the wrong API URL | `NEXT_PUBLIC_*` is baked at image build time (step 2 build args). Rebuild after the core/ai hostnames change. |

---

## 6. Prelaunch checklist

**This checklist must be signed off before the first production push.**
Items marked **[GATE]** are hard blockers — the checklist cannot be signed
off while any GATE item is unresolved. No-go audit findings become known issues
that slip under launch pressure without explicit gates here.

### Security

- [ ] **[GATE]** `INTERNAL_SERVICE_TOKEN` is in Key Vault (`internal-service-token`
      secret exists and is not `not-configured`) for both staging and prod.
- [ ] **[GATE]** AI service `/api/ai/conversations` returns 401 without the token;
      returns 200 with the correct `X-Internal-Token` header.
- [ ] **[GATE]** Rate limiting enforced globally: verify with concurrent requests
      across multiple instances that the Redis-backed counter triggers 429.
- [ ] **[GATE]** Encryption key present in Key Vault (`encryption-key`) and is a
      64-character hex string — test BYOK provider key save/load round-trip.
- [ ] All security audit categories in `docs/azure/prelaunch-security-audit.md`
      show **GO**.

### Network lockdown (prod)

- [ ] **[GATE]** AI service not reachable from the public internet in prod. Test:
      `curl https://<aiAppName>.azurewebsites.net/api/ai/conversations` from
      outside Azure — must return 403 or TCP connection refused (private endpoint).
- [ ] **[GATE]** Core→AI calls succeed through the VNet path in prod.
- [ ] AI service `ipSecurityRestrictions` applied: Azure portal → AI app →
      Networking → Access Restrictions — only `snet-app` allow rule present.

### SSE streaming

- [ ] SSE stream completes normally end-to-end through the core proxy:
      `curl -N https://<coreUrl>/v1/chat -H 'X-API-Key: <key>' -d '{"message":"hello"}'`
- [ ] **[GATE — disconnect cleanup]** Manual verification: run the above curl, kill
      it mid-stream with Ctrl-C, then check AI service logs for unclosed generator
      errors. No `GeneratorExit` unhandled traces should appear.
- [ ] No response buffering: chunks arrive incrementally (not in one burst after
      stream ends). If on App Service, confirm `X-Accel-Buffering: no` header
      is present in the response.

### Analytics / consent

- [ ] Cookie consent banner appears on first visit (no prior localStorage entry).
- [ ] GA4 and UET scripts are **not** present in page source before consent is
      given — verify with browser devtools network tab.
- [ ] After accepting consent, GA4/UET scripts load and fire pageview events.
- [ ] "Manage cookies" resets consent and banner reappears on reload.

### Pipeline

- [ ] `az bicep build --file infra/main.bicep` passes (no errors, warnings OK).
- [ ] Validate stage (`what-if`) completes green on a staging run.
- [ ] Staging deploy green with all three health checks passing.
- [ ] Manual approval gate active on `agentbase-prod` environment in ADO.
- [ ] Prod service connection uses "Specific pipelines" authorization.
- [ ] Rollback procedure tested: re-point an app at a previous tag and verify
      it comes up healthy.

### Sign-off

| Area | Signed off by | Date |
| --- | --- | --- |
| Security | | |
| Network lockdown (prod) | | |
| SSE streaming | | |
| Analytics / consent | | |
| Pipeline | | |

All GATE items resolved and all rows signed off before merging to production.

---

## 7. Local validation (before pushing)

```bash
az bicep build --file infra/main.bicep                 # lint
az deployment group what-if -g rg-agentbase-staging \  # preview
  --template-file infra/main.bicep \
  --parameters infra/main.parameters.staging.json \
               postgresAdminPassword=<pwd> containerImageTag=local
pnpm --filter @agentbase/core build                    # core compiles (image build)
```
