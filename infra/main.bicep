// =============================================================================
// main.bicep — Agentbase platform on Azure (composition root)
// =============================================================================
// Deploys the full Agentbase core platform — frontend (Next.js), core (NestJS),
// ai-service (FastAPI) — as Linux container App Services, backed by PostgreSQL
// Flexible Server, Cosmos DB (Mongo API), Azure Cache for Redis, Blob Storage,
// Key Vault, and Application Insights. Marketplace is a separate work item/pipeline.
//
// Constitution alignment (agentbase-azure/.specify/memory/constitution.md):
//   I   IaC-always      — every resource defined here, no portal changes
//   II  Security        — secrets in Key Vault via managed identity; least-priv RBAC;
//                         public data-tier access off in prod (private endpoints)
//   III Modular Bicep   — one module per service under infra/modules/
//   IV  Validation      — `az bicep build` + what-if gate in agentbase-deploy.yml
//   V   Cost            — low-cost paid SKUs (documented deviation in docs/azure/cost.md)
//
// Deploy: az deployment group create -g <rg> --template-file infra/main.bicep \
//           --parameters @infra/main.parameters.<env>.json \
//                        postgresAdminPassword=<secret> containerImageTag=<tag>
// =============================================================================

targetScope = 'resourceGroup'

// ----------------------------------------------------------------------------
// Parameters
// ----------------------------------------------------------------------------

@description('Deployment environment')
@allowed(['staging', 'prod'])
param environment string

@description('Project name used in resource naming')
param project string = 'agentbase'

@description('Owner tag — team or individual responsible for this deployment')
param owner string

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Short suffix for globally-unique resource names (ACR, Key Vault, Storage, etc.)')
param uniqueSuffix string = take(uniqueString(resourceGroup().id), 5)

@description('App Service Plan SKU (B2 for staging, P1v2 for prod)')
param appServicePlanSku string = 'B2'

@description('Container image tag to deploy (pipeline passes the build ID; defaults to latest)')
param containerImageTag string = 'latest'

@description('PostgreSQL administrator password (supplied by the pipeline from a masked variable group)')
@secure()
param postgresAdminPassword string

@description('Deploy VNet + private endpoints to lock the data tier off the public internet (prod)')
param deployPrivateNetworking bool = false

@description('Marketplace API base URL the core platform connects to (separate deployment)')
param marketplaceUrl string = 'https://marketplace.agentbase.dev/api/v1'

@description('Azure region for PostgreSQL Flexible Server. Defaults to location but can be overridden per-environment when the subscription lacks quota in the primary region.')
param postgresLocation string = location

@description('Object ID of the pipeline service principal that seeds Key Vault secrets. Granted Key Vault Secrets Officer so it can write secrets during deployment.')
param pipelineSpOid string = ''

// ----------------------------------------------------------------------------
// Variables — naming & tags
// ----------------------------------------------------------------------------

var tags = {
  environment: environment
  project: project
  owner: owner
  managedBy: 'bicep'
  workItem: '6'
}

var nameBase = '${project}-${environment}'
var compact = replace(project, '-', '') // alphanumeric-only base for ACR/Storage
var envShort = take(environment, 4) // keeps length-constrained names within limits

// Globally-unique names (length-constrained)
var acrName = toLower('acr${compact}${environment}${uniqueSuffix}')
var keyVaultName = take('kv-${project}-${envShort}-${uniqueSuffix}', 24)
var storageName = take(toLower('st${compact}${envShort}${uniqueSuffix}'), 24)
var postgresName = 'psql-${nameBase}-${uniqueSuffix}'
var cosmosName = toLower('cosmos-${nameBase}-${uniqueSuffix}')
var redisName = 'redis-${nameBase}-${uniqueSuffix}'

// App Service names (the default hostname must be globally unique → include suffix)
var coreAppName = 'app-${project}-core-${environment}-${uniqueSuffix}'
var frontendAppName = 'app-${project}-web-${environment}-${uniqueSuffix}'
var aiAppName = 'app-${project}-ai-${environment}-${uniqueSuffix}'

// Derived hostnames (computed from names to avoid circular dependencies)
var coreHost = '${coreAppName}.azurewebsites.net'
var frontendHost = '${frontendAppName}.azurewebsites.net'
var aiHost = '${aiAppName}.azurewebsites.net'

// Container image references
var coreImage = '${acr.outputs.loginServer}/${project}-core:${containerImageTag}'
var frontendImage = '${acr.outputs.loginServer}/${project}-frontend:${containerImageTag}'
var aiImage = '${acr.outputs.loginServer}/${project}-ai-service:${containerImageTag}'

// Key Vault secret-reference helper prefix
var kvUri = keyVault.outputs.uri
func kvRef(vaultUri string, secretName string) string =>
  '@Microsoft.KeyVault(SecretUri=${vaultUri}secrets/${secretName}/)'

// ----------------------------------------------------------------------------
// Observability, registry, secrets store
// ----------------------------------------------------------------------------

module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring'
  params: {
    name: nameBase
    location: location
    tags: tags
  }
}

module acr 'modules/container-registry.bicep' = {
  name: 'acr'
  params: {
    name: acrName
    location: location
    tags: tags
  }
}

module keyVault 'modules/key-vault.bicep' = {
  name: 'keyVault'
  params: {
    name: keyVaultName
    location: location
    tags: tags
    disablePublicAccess: deployPrivateNetworking
  }
}

// ----------------------------------------------------------------------------
// Data tier
// ----------------------------------------------------------------------------

module storage 'modules/storage-account.bicep' = {
  name: 'storage'
  params: {
    name: storageName
    location: location
    tags: tags
    disablePublicAccess: deployPrivateNetworking
  }
}

module postgres 'modules/postgres-flexible.bicep' = {
  name: 'postgres'
  params: {
    name: postgresName
    location: postgresLocation
    tags: tags
    administratorPassword: postgresAdminPassword
    allowPublicAccess: !deployPrivateNetworking
  }
}

module cosmos 'modules/cosmos-mongo.bicep' = {
  name: 'cosmos'
  params: {
    name: cosmosName
    location: location
    tags: tags
    disablePublicAccess: deployPrivateNetworking
  }
}

module redis 'modules/redis-cache.bicep' = {
  name: 'redis'
  params: {
    name: redisName
    location: location
    tags: tags
    disablePublicAccess: deployPrivateNetworking
  }
}

// ----------------------------------------------------------------------------
// Private networking (prod only)
// ----------------------------------------------------------------------------

module networking 'modules/networking.bicep' = if (deployPrivateNetworking) {
  name: 'networking'
  params: {
    name: nameBase
    location: location
    tags: tags
    privateEndpoints: [
      {
        name: 'pe-postgres'
        serviceId: postgres.outputs.id
        groupId: 'postgresqlServer'
        dnsZoneName: 'privatelink.postgres.database.azure.com'
      }
      {
        name: 'pe-cosmos'
        serviceId: cosmos.outputs.id
        groupId: 'MongoDB'
        dnsZoneName: 'privatelink.mongo.cosmos.azure.com'
      }
      {
        name: 'pe-redis'
        serviceId: redis.outputs.id
        groupId: 'redisCache'
        dnsZoneName: 'privatelink.redis.cache.windows.net'
      }
      {
        name: 'pe-blob'
        serviceId: storage.outputs.id
        groupId: 'blob'
        // Private-link DNS zone names are fixed FQDNs (public cloud), not env-derived.
        #disable-next-line no-hardcoded-env-urls
        dnsZoneName: 'privatelink.blob.core.windows.net'
      }
      {
        name: 'pe-keyvault'
        serviceId: keyVault.outputs.id
        groupId: 'vault'
        dnsZoneName: 'privatelink.vaultcore.azure.net'
      }
    ]
  }
}

// networking is only deployed when deployPrivateNetworking is true — same guard here,
// so the non-null assertion is safe.
var appSubnetId = deployPrivateNetworking ? networking!.outputs.appSubnetId : ''

// In prod (deployPrivateNetworking=true), restrict AI service inbound to the core app's
// VNet integration subnet only. Staging relies on the app-layer INTERNAL_SERVICE_TOKEN
// (WS1A) until VNet integration is promoted to staging in a follow-up.
var aiIpRestrictions = deployPrivateNetworking
  ? [
      {
        name: 'allow-core-vnet'
        priority: 100
        action: 'Allow'
        vnetSubnetResourceId: networking!.outputs.appSubnetId
        description: 'Allow inbound from App Service VNet integration subnet (core app only)'
      }
    ]
  : []

// ----------------------------------------------------------------------------
// Compute — App Service Plan + 3 container apps
// ----------------------------------------------------------------------------

module plan 'modules/app-service-plan.bicep' = {
  name: 'plan'
  params: {
    name: 'plan-${nameBase}'
    location: location
    tags: tags
    skuName: appServicePlanSku
  }
}

// ---- core (NestJS API) ----
module coreApp 'modules/app-service-container.bicep' = {
  name: 'coreApp'
  params: {
    name: coreAppName
    location: location
    tags: tags
    appServicePlanId: plan.outputs.id
    containerImage: coreImage
    acrLoginServer: acr.outputs.loginServer
    websitesPort: 3001
    appInsightsConnectionString: monitoring.outputs.connectionString
    healthCheckPath: '/api/health'
    vnetSubnetId: appSubnetId
    appSettings: [
      { name: 'NODE_ENV', value: 'production' }
      { name: 'APP_PORT', value: '3001' }
      { name: 'APP_URL', value: 'https://${coreHost}' }
      { name: 'FRONTEND_URL', value: 'https://${frontendHost}' }
      { name: 'AI_SERVICE_URL', value: 'https://${aiHost}' }
      { name: 'ENABLE_SWAGGER', value: 'false' }
      // Run pending TypeORM migrations on startup. Reaches the DB from inside Azure
      // (works for prod's private network, where a pipeline agent cannot). Safe under
      // autoscale: migrations run at bootstrap behind a Postgres advisory lock
      // (packages/core/src/main.ts), so concurrent instances serialize the DDL.
      { name: 'RUN_MIGRATIONS', value: 'true' }
      { name: 'MARKETPLACE_URL', value: marketplaceUrl }
      // PostgreSQL
      { name: 'POSTGRES_HOST', value: postgres.outputs.fqdn }
      { name: 'POSTGRES_PORT', value: '5432' }
      { name: 'POSTGRES_USER', value: postgres.outputs.administratorLogin }
      { name: 'POSTGRES_DB', value: postgres.outputs.databaseName }
      { name: 'POSTGRES_SSL', value: 'true' }
      { name: 'POSTGRES_PASSWORD', value: kvRef(kvUri, 'postgres-password') }
      // MongoDB (Cosmos)
      { name: 'MONGO_URI', value: kvRef(kvUri, 'mongo-uri') }
      // Redis (TLS on 6380)
      { name: 'REDIS_HOST', value: redis.outputs.hostName }
      { name: 'REDIS_PORT', value: string(redis.outputs.sslPort) }
      { name: 'REDIS_TLS', value: 'true' }
      { name: 'REDIS_PASSWORD', value: kvRef(kvUri, 'redis-password') }
      // Blob storage (managed identity — replaces S3)
      { name: 'STORAGE_PROVIDER', value: 'azure-blob' }
      { name: 'AZURE_STORAGE_ACCOUNT', value: storage.outputs.name }
      { name: 'AZURE_STORAGE_BLOB_ENDPOINT', value: storage.outputs.blobEndpoint }
      { name: 'AZURE_STORAGE_CONTAINER', value: storage.outputs.uploadsContainerName }
      // Auth & encryption secrets
      { name: 'JWT_SECRET', value: kvRef(kvUri, 'jwt-secret') }
      { name: 'JWT_REFRESH_SECRET', value: kvRef(kvUri, 'jwt-refresh-secret') }
      { name: 'ENCRYPTION_KEY', value: kvRef(kvUri, 'encryption-key') }
      { name: 'PLUGIN_SETTINGS_ENCRYPTION_KEY', value: kvRef(kvUri, 'plugin-settings-encryption-key') }
      // Auth token lifetimes (match .env.example defaults)
      { name: 'JWT_EXPIRATION', value: '24h' }
      { name: 'JWT_REFRESH_EXPIRATION', value: '7d' }
      // Payments
      { name: 'STRIPE_SECRET_KEY', value: kvRef(kvUri, 'stripe-secret-key') }
      { name: 'STRIPE_WEBHOOK_SECRET', value: kvRef(kvUri, 'stripe-webhook-secret') }
      // Service-to-service auth: core presents this token to AI service on every internal call
      { name: 'INTERNAL_SERVICE_TOKEN', value: kvRef(kvUri, 'internal-service-token') }
    ]
  }
}

// ---- frontend (Next.js) ----
module frontendApp 'modules/app-service-container.bicep' = {
  name: 'frontendApp'
  params: {
    name: frontendAppName
    location: location
    tags: tags
    appServicePlanId: plan.outputs.id
    containerImage: frontendImage
    acrLoginServer: acr.outputs.loginServer
    websitesPort: 3000
    appInsightsConnectionString: monitoring.outputs.connectionString
    healthCheckPath: '/'
    vnetSubnetId: appSubnetId
    // NEXT_PUBLIC_* values are baked at build time (Docker build args); no secrets at runtime.
    appSettings: []
  }
}

// ---- ai-service (FastAPI) ----
module aiApp 'modules/app-service-container.bicep' = {
  name: 'aiApp'
  params: {
    name: aiAppName
    location: location
    tags: tags
    appServicePlanId: plan.outputs.id
    containerImage: aiImage
    acrLoginServer: acr.outputs.loginServer
    websitesPort: 8000
    appInsightsConnectionString: monitoring.outputs.connectionString
    healthCheckPath: '/api/ai/health'
    vnetSubnetId: appSubnetId
    ipSecurityRestrictions: aiIpRestrictions
    appSettings: [
      { name: 'MONGO_URI', value: kvRef(kvUri, 'mongo-uri') }
      { name: 'OPENAI_API_KEY', value: kvRef(kvUri, 'openai-api-key') }
      { name: 'ANTHROPIC_API_KEY', value: kvRef(kvUri, 'anthropic-api-key') }
      { name: 'GEMINI_API_KEY', value: kvRef(kvUri, 'gemini-api-key') }
      { name: 'HUGGINGFACE_API_KEY', value: kvRef(kvUri, 'huggingface-api-key') }
      // CORS allow_origins — must match the actual deployed URLs, not localhost defaults
      { name: 'CORE_API_URL', value: 'https://${coreHost}' }
      // FRONTEND_URL intentionally omitted — browser never calls AI service directly;
      // CORS is restricted to CORE_API_URL only (see ai-service/app/main.py)
      // Service-to-service auth: AI service validates this token on all /api/ai/* routes
      { name: 'INTERNAL_SERVICE_TOKEN', value: kvRef(kvUri, 'internal-service-token') }
    ]
  }
}

// ----------------------------------------------------------------------------
// RBAC — least-privilege role assignments per app identity
// ----------------------------------------------------------------------------

module coreRbac 'modules/rbac.bicep' = {
  name: 'coreRbac'
  params: {
    principalId: coreApp.outputs.principalId
    acrName: acr.outputs.name
    keyVaultName: keyVault.outputs.name
    storageAccountName: storage.outputs.name
    assignKeyVaultRole: true
    assignStorageRole: true // core writes uploads to Blob
  }
}

module frontendRbac 'modules/rbac.bicep' = {
  name: 'frontendRbac'
  params: {
    principalId: frontendApp.outputs.principalId
    acrName: acr.outputs.name
    keyVaultName: keyVault.outputs.name
    assignKeyVaultRole: false // no secrets — AcrPull only
    assignStorageRole: false
  }
}

module aiRbac 'modules/rbac.bicep' = {
  name: 'aiRbac'
  params: {
    principalId: aiApp.outputs.principalId
    acrName: acr.outputs.name
    keyVaultName: keyVault.outputs.name
    assignKeyVaultRole: true
    assignStorageRole: false
  }
}

// Grant the pipeline service principal Key Vault Secrets Officer so it can write
// secrets during deployment (seed-keyvault.sh). Apps use Secrets User (read-only).
var kvSecretsOfficerRoleId = 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7'
resource kvPipelineRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(pipelineSpOid)) {
  scope: keyVaultRes
  name: guid(keyVaultRes.id, pipelineSpOid, kvSecretsOfficerRoleId)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsOfficerRoleId)
    principalId: pipelineSpOid
    principalType: 'ServicePrincipal'
  }
}

resource keyVaultRes 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

// ----------------------------------------------------------------------------
// AI service private endpoint (prod only)
// Deployed as a separate module after both aiApp and networking to avoid the
// circular dependency that would arise from passing aiApp.outputs.id into the
// networking module (which aiApp already depends on for its VNet subnet).
// ----------------------------------------------------------------------------

module aiServicePe 'modules/pe-ai-service.bicep' = if (deployPrivateNetworking) {
  name: 'aiServicePe'
  params: {
    location: location
    tags: tags
    aiAppId: aiApp.outputs.id
    peSubnetId: networking!.outputs.peSubnetId
    vnetId: networking!.outputs.vnetId
  }
}

// ----------------------------------------------------------------------------
// Outputs — consumed by agentbase-deploy.yml
// ----------------------------------------------------------------------------

output acrName string = acr.outputs.name
output acrLoginServer string = acr.outputs.loginServer
output keyVaultName string = keyVault.outputs.name
output cosmosAccountName string = cosmos.outputs.accountName
output redisName string = redis.outputs.name

output coreAppName string = coreApp.outputs.name
output frontendAppName string = frontendApp.outputs.name
output aiAppName string = aiApp.outputs.name

output coreUrl string = 'https://${coreHost}'
output frontendUrl string = 'https://${frontendHost}'
output aiUrl string = 'https://${aiHost}'
