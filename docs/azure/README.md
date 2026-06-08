# Agentbase on Azure

Infrastructure-as-Code (Bicep) and CI/CD for deploying the **Agentbase core
platform** (frontend + core + ai-service) to Azure. Delivered for work item 6.

## Contents

| Doc | What it covers |
|-----|----------------|
| [architecture.md](architecture.md) | Target architecture, Azure resources, 5 Mermaid diagrams, security model, constitution alignment |
| [pipeline.md](pipeline.md) | `agentbase-deploy.yml` runbook — one-time setup, run flow, rollback, teardown, troubleshooting |
| [cost.md](cost.md) | SKU choices, monthly cost estimate, cost levers, free-tier notes |

## Code

| Path | Purpose |
|------|---------|
| [`infra/main.bicep`](../../infra/main.bicep) | Composition root (sole deployment entry point) |
| [`infra/modules/`](../../infra/modules/) | One module per Azure service |
| [`infra/main.parameters.*.json`](../../infra/) | Per-environment (staging / prod) inputs |
| [`azure-pipelines/agentbase-deploy.yml`](../../azure-pipelines/agentbase-deploy.yml) | Multi-stage CI/CD pipeline |
| [`azure-pipelines/templates/deploy-env.yml`](../../azure-pipelines/templates/deploy-env.yml) | Reusable per-environment deploy stage |
| [`azure-pipelines/scripts/`](../../azure-pipelines/scripts/) | `seed-keyvault.sh`, `health-check.sh` |

## Quick start

```bash
# Validate locally
az bicep build --file infra/main.bicep
az deployment group what-if -g rg-agentbase-staging \
  --template-file infra/main.bicep \
  --parameters infra/main.parameters.staging.json \
               postgresAdminPassword=<pwd> containerImageTag=local
```

Then configure the pipeline prerequisites in [pipeline.md](pipeline.md) and push
to `main`. Staging deploys automatically; production waits for manual approval.

> **Scope:** this provisions the Agentbase core platform only. The proprietary
> **Marketplace** is deployed by its own pipeline (a separate work item) and is
> shown in [architecture.md](architecture.md) for context.
