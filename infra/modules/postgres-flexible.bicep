// postgres-flexible.bicep — Azure Database for PostgreSQL Flexible Server
// Cost: Burstable B1ms (~$13/mo) + 32 GB storage. Matches TypeORM/pg in @agentbase/core.
// Security: TLS enforced; admin password from @secure() param (seeded to Key Vault for the
//           app). Public access toggled off in prod (reach via private endpoint).
//           Hardening path: Entra-only auth + managed identity (see docs/azure/architecture.md).

@description('Globally-unique server name (lowercase, 3-63 chars)')
param name string

@description('Azure region')
param location string

@description('Resource tags')
param tags object

@description('PostgreSQL administrator login')
param administratorLogin string = 'agentbase'

@description('PostgreSQL administrator password')
@secure()
param administratorPassword string

@description('Application database name')
param databaseName string = 'agentbase'

@description('Allow public network access with Azure-services firewall rule (staging). False = private only (prod).')
param allowPublicAccess bool = true

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorPassword
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled' // cost: single-region backups
    }
    highAvailability: {
      mode: 'Disabled' // cost: no standby replica
    }
    network: {
      publicNetworkAccess: allowPublicAccess ? 'Enabled' : 'Disabled'
    }
  }
}

// Allow other Azure services (e.g. App Service) to reach the server when public access is on.
// 0.0.0.0-0.0.0.0 is the Azure-internal "AllowAllAzureServices" rule, not the public internet.
resource allowAzureServices 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-12-01-preview' = if (allowPublicAccess) {
  parent: postgres
  name: 'AllowAllAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  parent: postgres
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

@description('Fully-qualified domain name, e.g. psql-agentbase.postgres.database.azure.com')
output fqdn string = postgres.properties.fullyQualifiedDomainName

@description('Server resource ID (for private endpoint)')
output id string = postgres.id

@description('Administrator login (non-secret)')
output administratorLogin string = administratorLogin

@description('Application database name')
output databaseName string = databaseName
