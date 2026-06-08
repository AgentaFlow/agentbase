// rbac.bicep — Least-privilege role assignments for one app's managed identity.
// Grants: AcrPull (image pull), Key Vault Secrets User (read secrets),
//         and optionally Storage Blob Data Contributor (uploads — core only).
// Constitution II: minimum required RBAC; no Owner/Contributor on data resources.

@description('Managed identity principal ID to grant roles to')
param principalId string

@description('ACR name (scope for AcrPull)')
param acrName string

@description('Key Vault name (scope for Key Vault Secrets User)')
param keyVaultName string

@description('Storage account name (scope for Storage Blob Data Contributor). Empty = skip.')
param storageAccountName string = ''

@description('Whether to assign Key Vault Secrets User (skip for apps with no secrets, e.g. frontend)')
param assignKeyVaultRole bool = true

@description('Whether to assign the Storage Blob Data Contributor role')
param assignStorageRole bool = false

// Built-in role definition IDs
var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'
var keyVaultSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'
var storageBlobDataContributorRoleId = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'

resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' existing = {
  name: acrName
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' existing = if (assignStorageRole) {
  name: storageAccountName
}

resource acrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: acr
  name: guid(acr.id, principalId, acrPullRoleId)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}

resource kvSecretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (assignKeyVaultRole) {
  scope: keyVault
  name: guid(keyVault.id, principalId, keyVaultSecretsUserRoleId)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsUserRoleId)
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}

resource storageBlobContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (assignStorageRole) {
  scope: storage
  name: guid(storage.id, principalId, storageBlobDataContributorRoleId)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataContributorRoleId)
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}
