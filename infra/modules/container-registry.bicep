// container-registry.bicep — Azure Container Registry (Basic)
// Cost: Basic ~$5/mo, 10 GB included storage.
// Security: admin user disabled; App Services pull via managed identity (AcrPull).

@description('Globally-unique ACR name (alphanumeric only, 5-50 chars)')
@minLength(5)
@maxLength(50)
param name string

@description('Azure region')
param location string

@description('Resource tags')
param tags object

resource registry 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false // Security: no shared admin creds — managed identity only
    publicNetworkAccess: 'Enabled' // Basic SKU does not support Private Link
    anonymousPullEnabled: false
  }
}

@description('ACR resource ID (for AcrPull role assignment)')
output id string = registry.id

@description('ACR login server, e.g. acragentbase.azurecr.io')
output loginServer string = registry.properties.loginServer

@description('ACR name')
output name string = registry.name
