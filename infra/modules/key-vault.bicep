// key-vault.bicep — Azure Key Vault (Standard) with RBAC authorisation
// Cost: Standard tier — 10,000 operations/month free, no HSM.
// Security: RBAC authZ (not access policies); apps read secrets via managed identity.
// Pattern adapted from agentbase-azure/infra/modules/key-vault.bicep.

@description('Globally-unique Key Vault name (3-24 chars, alphanumeric + hyphens)')
@minLength(3)
@maxLength(24)
param name string

@description('Azure region')
param location string

@description('Resource tags')
param tags object

@description('Disable public network access (true in prod — reach via private endpoint)')
param disablePublicAccess bool = false

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    enablePurgeProtection: true
    publicNetworkAccess: disablePublicAccess ? 'Disabled' : 'Enabled'
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: disablePublicAccess ? 'Deny' : 'Allow'
    }
  }
}

@description('Key Vault URI (e.g. https://kv-agentbase.vault.azure.net/)')
output uri string = keyVault.properties.vaultUri

@description('Key Vault name')
output name string = keyVault.name

@description('Key Vault resource ID (for private endpoint)')
output id string = keyVault.id
