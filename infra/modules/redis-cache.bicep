// redis-cache.bicep — Azure Cache for Redis (Basic C0)
// Cost: Basic C0 (~$16/mo), 250 MB, single node (no SLA). Used for caching / throttling.
// Security: non-SSL port disabled (TLS-only on 6380), TLS1.2 min. Access key fetched by the
//           pipeline and seeded to Key Vault. Clients MUST connect with TLS (see app wiring).

@description('Globally-unique Redis name (1-63 chars)')
param name string

@description('Azure region')
param location string

@description('Resource tags')
param tags object

@description('Disable public network access (true in prod — reach via private endpoint)')
param disablePublicAccess bool = false

resource redis 'Microsoft.Cache/redis@2024-03-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'Basic'
      family: 'C'
      capacity: 0
    }
    enableNonSslPort: false // TLS-only
    minimumTlsVersion: '1.2'
    publicNetworkAccess: disablePublicAccess ? 'Disabled' : 'Enabled'
    redisConfiguration: {}
  }
}

@description('Redis hostname, e.g. redis-agentbase.redis.cache.windows.net')
output hostName string = redis.properties.hostName

@description('SSL port (always 6380)')
output sslPort int = redis.properties.sslPort

@description('Redis name (pipeline uses this to fetch the primary access key)')
output name string = redis.name

@description('Redis resource ID (for private endpoint)')
output id string = redis.id
