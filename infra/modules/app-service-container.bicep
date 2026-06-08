// app-service-container.bicep — Linux container Web App with managed identity.
// Instantiated 3× (core, frontend, ai-service). Pulls its image from ACR using the
// system-assigned managed identity (no registry credentials stored).
// Security: HTTPS-only, FTPS disabled, TLS1.2 min, system-assigned identity for ACR/KV.

@description('Web App name')
param name string

@description('Azure region')
param location string

@description('Resource tags')
param tags object

@description('App Service Plan resource ID')
param appServicePlanId string

@description('Container image reference, e.g. acragentbase.azurecr.io/agentbase-core:1234')
param containerImage string

@description('ACR login server (for managed-identity pull)')
param acrLoginServer string

@description('Port the container listens on (WEBSITES_PORT)')
param websitesPort int

@description('Application Insights connection string')
param appInsightsConnectionString string

@description('Health check path, e.g. /api/health')
param healthCheckPath string

@description('App-specific settings (name/value pairs), including Key Vault references')
param appSettings array = []

@description('Optional regional VNet integration subnet ID (prod). Empty = no integration.')
param vnetSubnetId string = ''

@description('Keep the app warm (Always On). Not supported on Free/Shared tiers.')
param alwaysOn bool = true

// Settings common to every container app — merged with the caller's app-specific settings.
var baseAppSettings = [
  {
    name: 'WEBSITES_PORT'
    value: string(websitesPort)
  }
  {
    name: 'DOCKER_REGISTRY_SERVER_URL'
    value: 'https://${acrLoginServer}'
  }
  {
    name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE'
    value: 'false'
  }
  {
    name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
    value: appInsightsConnectionString
  }
  {
    name: 'ApplicationInsightsAgent_EXTENSION_VERSION'
    value: '~3'
  }
]

resource app 'Microsoft.Web/sites@2023-12-01' = {
  name: name
  location: location
  tags: tags
  kind: 'app,linux,container'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlanId
    httpsOnly: true
    virtualNetworkSubnetId: empty(vnetSubnetId) ? null : vnetSubnetId
    siteConfig: {
      linuxFxVersion: 'DOCKER|${containerImage}'
      acrUseManagedIdentityCreds: true // pull image via system-assigned identity (AcrPull)
      alwaysOn: alwaysOn
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: true
      healthCheckPath: healthCheckPath
      vnetRouteAllEnabled: empty(vnetSubnetId) ? false : true
      appSettings: concat(baseAppSettings, appSettings)
    }
  }
}

@description('System-assigned managed identity principal ID (for RBAC)')
output principalId string = app.identity.principalId

@description('Default hostname, e.g. app-agentbase-core.azurewebsites.net')
output defaultHostName string = app.properties.defaultHostName

@description('Web App name')
output name string = app.name
