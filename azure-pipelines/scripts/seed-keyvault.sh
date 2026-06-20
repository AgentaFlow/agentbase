#!/usr/bin/env bash
# =============================================================================
# seed-keyvault.sh — Idempotently populate Key Vault with the secrets the
# Agentbase apps read via Key Vault references. Safe to run on every deploy.
#
# Strategy:
#   - postgres-password / mongo-uri / redis-password : always refreshed from the
#     source of truth (variable group + Azure control-plane key lists).
#   - jwt / encryption keys : created once (generated if not supplied); never
#     rotated automatically, so existing sessions/data stay valid across deploys.
#   - stripe / ai-provider keys : set when supplied; otherwise a 'not-configured'
#     placeholder so the Key Vault reference always resolves.
#
# Required env:
#   KEY_VAULT_NAME, RESOURCE_GROUP, COSMOS_ACCOUNT, REDIS_NAME, PG_ADMIN_PASSWORD
# Optional env (override generated/placeholder values):
#   JWT_SECRET, JWT_REFRESH_SECRET, ENCRYPTION_KEY, PLUGIN_SETTINGS_ENCRYPTION_KEY,
#   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
#   OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY
# =============================================================================
set -euo pipefail

: "${KEY_VAULT_NAME:?KEY_VAULT_NAME is required}"
: "${RESOURCE_GROUP:?RESOURCE_GROUP is required}"
: "${COSMOS_ACCOUNT:?COSMOS_ACCOUNT is required}"
: "${REDIS_NAME:?REDIS_NAME is required}"
: "${PG_ADMIN_PASSWORD:?PG_ADMIN_PASSWORD is required}"

PLACEHOLDER="not-configured"

# Overwrite a secret with the authoritative value.
set_secret() {
  az keyvault secret set --vault-name "$KEY_VAULT_NAME" --name "$1" --value "$2" --output none
  echo "  ✔ set $1"
}

# Create a secret only if absent (preserves generated keys across deploys).
ensure_secret() {
  if az keyvault secret show --vault-name "$KEY_VAULT_NAME" --name "$1" >/dev/null 2>&1; then
    echo "  • $1 already present — left unchanged"
  else
    az keyvault secret set --vault-name "$KEY_VAULT_NAME" --name "$1" --value "$2" --output none
    echo "  ✔ created $1"
  fi
}

gen() { openssl rand -hex 32; }
# Empty, or an unexpanded Azure DevOps macro like "$(STRIPE_SECRET_KEY)" (undefined
# optional variable), collapses to the placeholder.
or_placeholder() {
  local v="${1:-}"
  case "$v" in
    '' | '$('*')') printf '%s' "$PLACEHOLDER" ;;
    *) printf '%s' "$v" ;;
  esac
}

echo "Seeding secrets into Key Vault '$KEY_VAULT_NAME'..."

# --- Connection secrets fetched from the Azure control plane (work even when the
#     data plane is private) ---
MONGO_URI=$(az cosmosdb keys list --name "$COSMOS_ACCOUNT" --resource-group "$RESOURCE_GROUP" \
  --type connection-strings --query "connectionStrings[0].connectionString" -o tsv)
REDIS_KEY=$(az redis list-keys --name "$REDIS_NAME" --resource-group "$RESOURCE_GROUP" \
  --query primaryKey -o tsv)

set_secret postgres-password "$PG_ADMIN_PASSWORD"
set_secret mongo-uri "$MONGO_URI"
set_secret redis-password "$REDIS_KEY"

# --- Generated-once secrets (do not rotate automatically) ---
ensure_secret jwt-secret "$(or_placeholder "${JWT_SECRET:-$(gen)}")"
ensure_secret jwt-refresh-secret "$(or_placeholder "${JWT_REFRESH_SECRET:-$(gen)}")"
ensure_secret encryption-key "$(or_placeholder "${ENCRYPTION_KEY:-$(gen)}")"
ensure_secret plugin-settings-encryption-key "$(or_placeholder "${PLUGIN_SETTINGS_ENCRYPTION_KEY:-$(gen)}")"
# Shared secret for core→AI service calls. Generated independently from JWT_SECRET;
# never derived from it. Rotate independently when needed.
ensure_secret internal-service-token "$(gen)"

# --- Optional integration secrets (placeholder keeps the KV reference resolvable) ---
set_secret stripe-secret-key "$(or_placeholder "${STRIPE_SECRET_KEY:-}")"
set_secret stripe-webhook-secret "$(or_placeholder "${STRIPE_WEBHOOK_SECRET:-}")"
set_secret openai-api-key "$(or_placeholder "${OPENAI_API_KEY:-}")"
set_secret anthropic-api-key "$(or_placeholder "${ANTHROPIC_API_KEY:-}")"
set_secret gemini-api-key "$(or_placeholder "${GEMINI_API_KEY:-}")"
set_secret huggingface-api-key "$(or_placeholder "${HUGGINGFACE_API_KEY:-}")"

echo "Key Vault seeding complete."
