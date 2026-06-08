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

### 1.2 Service connection

Create an Azure Resource Manager **service connection** (Project Settings →
Service connections) scoped to the subscription, e.g. named
`agentbase-azure`. Grant its service principal **Contributor** + **User Access
Administrator** on both resource groups (User Access Administrator is required
because the Bicep creates **role assignments** in `rbac.bicep`).

### 1.3 Variable group

Create a variable group named **`agentbase-deploy-config`** (Pipelines →
Library) with:

| Variable | Secret? | Example / purpose |
|----------|:------:|-------------------|
| `AZURE_SERVICE_CONNECTION` | no | `agentbase-azure` |
| `RG_STAGING` | no | `rg-agentbase-staging` |
| `RG_PROD` | no | `rg-agentbase-prod` |
| `PG_ADMIN_PASSWORD` | **yes** | PostgreSQL admin password (≥ 12 chars, complex) |
| `TEARDOWN_RESOURCE_GROUP` | no | RG the teardown stage deletes when enabled |
| `STRIPE_SECRET_KEY` | yes | *(optional)* payments |
| `STRIPE_WEBHOOK_SECRET` | yes | *(optional)* |
| `OPENAI_API_KEY` | yes | *(optional)* AI provider |
| `ANTHROPIC_API_KEY` | yes | *(optional)* |
| `GEMINI_API_KEY` | yes | *(optional)* |

Optional secrets left undefined are stored in Key Vault as `not-configured`
placeholders so their Key Vault references still resolve. `jwt-secret`,
`jwt-refresh-secret`, `encryption-key`, and `plugin-settings-encryption-key`
are **generated once** by the seed script and preserved across deploys.

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

## 6. Local validation (before pushing)

```bash
az bicep build --file infra/main.bicep                 # lint
az deployment group what-if -g rg-agentbase-staging \  # preview
  --template-file infra/main.bicep \
  --parameters infra/main.parameters.staging.json \
               postgresAdminPassword=<pwd> containerImageTag=local
pnpm --filter @agentbase/core build                    # core compiles (image build)
```
