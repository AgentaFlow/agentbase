// networking.bicep — VNet, App integration subnet, and Private Endpoints (prod).
// Constitution II: locks the data tier off the public internet. Deployed only when
// deployPrivateNetworking = true (prod). Apps reach data services over private IPs;
// private DNS zones resolve the *.privatelink.* FQDNs to those IPs.
// Cost: VNet is free; each private endpoint ~$7/mo.

@description('Base name for networking resources')
param name string

@description('Azure region')
param location string

@description('Resource tags')
param tags object

@description('VNet address space')
param vnetAddressPrefix string = '10.20.0.0/16'

@description('App Service regional integration subnet prefix')
param appSubnetPrefix string = '10.20.1.0/24'

@description('Private endpoint subnet prefix')
param privateEndpointSubnetPrefix string = '10.20.2.0/24'

@description('Private endpoint specs: { name, serviceId, groupId, dnsZoneName }')
param privateEndpoints array

resource vnet 'Microsoft.Network/virtualNetworks@2023-11-01' = {
  name: 'vnet-${name}'
  location: location
  tags: tags
  properties: {
    addressSpace: {
      addressPrefixes: [vnetAddressPrefix]
    }
    subnets: [
      {
        name: 'snet-app'
        properties: {
          addressPrefix: appSubnetPrefix
          delegations: [
            {
              name: 'appservice-delegation'
              properties: {
                serviceName: 'Microsoft.Web/serverFarms'
              }
            }
          ]
        }
      }
      {
        name: 'snet-pe'
        properties: {
          addressPrefix: privateEndpointSubnetPrefix
          privateEndpointNetworkPolicies: 'Disabled'
        }
      }
    ]
  }
}

resource appSubnet 'Microsoft.Network/virtualNetworks/subnets@2023-11-01' existing = {
  parent: vnet
  name: 'snet-app'
}

resource peSubnet 'Microsoft.Network/virtualNetworks/subnets@2023-11-01' existing = {
  parent: vnet
  name: 'snet-pe'
}

// One private DNS zone per backing service (e.g. privatelink.postgres.database.azure.com)
resource dnsZones 'Microsoft.Network/privateDnsZones@2020-06-01' = [
  for pe in privateEndpoints: {
    name: pe.dnsZoneName
    location: 'global'
    tags: tags
  }
]

resource dnsZoneLinks 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = [
  for (pe, i) in privateEndpoints: {
    parent: dnsZones[i]
    name: 'link-${name}'
    location: 'global'
    properties: {
      registrationEnabled: false
      virtualNetwork: {
        id: vnet.id
      }
    }
  }
]

resource endpoints 'Microsoft.Network/privateEndpoints@2023-11-01' = [
  for (pe, i) in privateEndpoints: {
    name: 'pe-${pe.name}'
    location: location
    tags: tags
    properties: {
      subnet: {
        id: peSubnet.id
      }
      privateLinkServiceConnections: [
        {
          name: pe.name
          properties: {
            privateLinkServiceId: pe.serviceId
            groupIds: [pe.groupId]
          }
        }
      ]
    }
  }
]

resource endpointDnsGroups 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-11-01' = [
  for (pe, i) in privateEndpoints: {
    parent: endpoints[i]
    name: 'default'
    properties: {
      privateDnsZoneConfigs: [
        {
          name: replace(pe.dnsZoneName, '.', '-')
          properties: {
            privateDnsZoneId: dnsZones[i].id
          }
        }
      ]
    }
  }
]

@description('App Service regional VNet integration subnet ID')
output appSubnetId string = appSubnet.id
