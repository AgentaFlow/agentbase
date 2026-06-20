// pe-ai-service.bicep — Private endpoint for the AI service App Service (prod only).
// Deployed as a separate module so it can depend on both the AI App (for its resource ID)
// and the networking module (for the PE subnet ID) without creating a circular dependency
// in main.bicep (networking already runs before aiApp due to subnet delegation).

@description('Azure region')
param location string

@description('Resource tags')
param tags object

@description('AI service App Service resource ID')
param aiAppId string

@description('Private endpoint subnet resource ID (snet-pe)')
param peSubnetId string

@description('VNet resource ID for private DNS zone link')
param vnetId string

resource pe 'Microsoft.Network/privateEndpoints@2023-11-01' = {
  name: 'pe-ai-service'
  location: location
  tags: tags
  properties: {
    subnet: {
      id: peSubnetId
    }
    privateLinkServiceConnections: [
      {
        name: 'pe-ai-service'
        properties: {
          privateLinkServiceId: aiAppId
          groupIds: ['sites']
        }
      }
    ]
  }
}

// Private-link DNS zone names are fixed FQDNs (public cloud), not env-derived.
#disable-next-line no-hardcoded-env-urls
resource dnsZone 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: 'privatelink.azurewebsites.net'
  location: 'global'
  tags: tags
}

resource dnsZoneLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: dnsZone
  name: 'link-ai-service'
  location: 'global'
  properties: {
    registrationEnabled: false
    virtualNetwork: {
      id: vnetId
    }
  }
}

resource dnsZoneGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-11-01' = {
  parent: pe
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'privatelink-azurewebsites-net'
        properties: {
          privateDnsZoneId: dnsZone.id
        }
      }
    ]
  }
}
