# Azure Cost Design

Work item 6 deploys the **real** Agentbase platform (three services + a managed
data tier), which cannot run on the Azure Free tier the
[constitution](https://github.com/AgentaFlow/agentbase-azure) targets in
Principle V. This is an **approved deviation**: low-cost paid SKUs are used and
documented here.

---

## Estimated monthly cost

Rough East US list prices; actual cost varies with usage (serverless/PAYG items)
and currency. Treat as order-of-magnitude.

### Production (`rg-agentbase-prod`)

| Resource | SKU | ~USD/mo |
|----------|-----|--------:|
| App Service Plan (hosts all 3 apps) | P1v2 | ~$70 |
| PostgreSQL Flexible Server | Burstable B1ms + 32 GB | ~$13 |
| Cosmos DB (Mongo API) | Serverless | ~$0–10 |
| Azure Cache for Redis | Basic C0 | ~$16 |
| Container Registry | Basic | ~$5 |
| Storage Account | Standard LRS | ~$1–3 |
| Log Analytics + App Insights | PAYG (1 GB/day cap) | ~$2–5 |
| Private endpoints | 5 × ~$7 | ~$36 |
| **Total (prod)** | | **≈ $150–160** |

### Staging (`rg-agentbase-staging`)

| Resource | SKU | ~USD/mo |
|----------|-----|--------:|
| App Service Plan | B2 | ~$26 |
| PostgreSQL Flexible | B1ms | ~$13 |
| Cosmos DB | Serverless | ~$0–10 |
| Redis | Basic C0 | ~$16 |
| ACR / Storage / monitoring | Basic / LRS / PAYG | ~$8 |
| Private endpoints | none (public + firewall) | $0 |
| **Total (staging)** | | **≈ $65–75** |

> Prod is ~$36/mo more than the resources alone because of the 5 private
> endpoints that take the data tier off the public internet (constitution II).
> Drop them only if you accept public data-tier access.

---

## Cost levers

- **Biggest line item is the App Service Plan.** P1v2 → B2 in prod roughly halves
  it, at the cost of Always-On guarantees and deployment slots. Set in
  `infra/main.parameters.prod.json` (`appServicePlanSku`).
- **Private endpoints** (~$7 each) are prod-only. Set `deployPrivateNetworking:
  false` to drop all five (~$36/mo) if the security trade-off is acceptable.
- **Cosmos serverless** bills per request — near-zero idle. Keep serverless
  unless sustained high throughput makes provisioned RU/s cheaper.
- **Redis Basic C0** has no SLA (single node). It is provisioned for the future
  Redis-backed rate limiter; remove the `redis` module + `REDIS_*` settings to
  save ~$16/mo until that feature lands.
- **Log Analytics** is capped at 1 GB/day (`monitoring.bicep` `dailyQuotaGb`).
  Raise only if you need more retention/ingestion.
- **Teardown** non-prod when idle — the pipeline's Teardown stage deletes a whole
  resource group (see [pipeline.md](pipeline.md)).

---

## Free-tier notes

Where a free option exists it is preferred within the paid posture:

- **Cosmos DB** can enable an account-level **free tier** (first 1000 RU/s + 25
  GB free, one per subscription) instead of serverless if that one free account
  is unused — change `cosmos-mongo.bicep`.
- **App Insights / Log Analytics** include 5 GB/month free ingestion.
- A genuine free-tier-only showcase already exists in the separate
  **agentbase-azure** repo (App Service F1, no database).

---

## Tags & cost attribution

Every resource is tagged (`main.bicep`) with `environment`, `project`, `owner`,
`managedBy=bicep`, and `workItem=6`, so cost can be filtered by these in **Cost
Management → Cost analysis**. Recommended: set a **budget + alert** per resource
group (e.g. $200 prod, $100 staging).
