// storage-account.bicep — Standard LRS blob storage for uploads (replaces S3)
// Cost: Standard LRS — pay per GB stored + transactions; negligible at low volume.
// Security: HTTPS-only, TLS1.2 min, no public blob access, no shared-key access
//           (apps use managed identity + Storage Blob Data Contributor).

@description('Globally-unique storage account name (3-24 chars, lowercase alphanumeric)')
@minLength(3)
@maxLength(24)
param name string

@description('Azure region')
param location string

@description('Resource tags')
param tags object

@description('Blob container name for application uploads')
param uploadsContainerName string = 'uploads'

@description('Disable public network access (true in prod — reach via private endpoint)')
param disablePublicAccess bool = false

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false // Force managed-identity (Entra) auth — no account keys
    publicNetworkAccess: disablePublicAccess ? 'Disabled' : 'Enabled'
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: disablePublicAccess ? 'Deny' : 'Allow'
    }
    encryption: {
      services: {
        blob: {
          enabled: true
        }
      }
      keySource: 'Microsoft.Storage'
    }
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
}

resource uploadsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: uploadsContainerName
  properties: {
    publicAccess: 'None'
  }
}

@description('Storage account name')
output name string = storage.name

@description('Storage account resource ID (for RBAC + private endpoint)')
output id string = storage.id

@description('Primary blob endpoint, e.g. https://stagentbase.blob.core.windows.net/')
output blobEndpoint string = storage.properties.primaryEndpoints.blob

@description('Uploads container name')
output uploadsContainerName string = uploadsContainerName
