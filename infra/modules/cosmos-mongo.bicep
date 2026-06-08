// cosmos-mongo.bicep — Azure Cosmos DB for MongoDB (API), serverless
// Cost: Serverless capacity = pay-per-request (no hourly RU charge); ideal for low/variable
//       load. Matches Mongoose in @agentbase/core and @agentbase/ai-service.
// Security: TLS enforced by default; connection string fetched by the pipeline and seeded
//           to Key Vault. Public access toggled off in prod (reach via private endpoint).

@description('Globally-unique Cosmos account name (lowercase, 3-44 chars)')
param name string

@description('Azure region')
param location string

@description('Resource tags')
param tags object

@description('Mongo database name')
param databaseName string = 'agentbase'

@description('Disable public network access (true in prod — reach via private endpoint)')
param disablePublicAccess bool = false

resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: name
  location: location
  tags: tags
  kind: 'MongoDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    apiProperties: {
      serverVersion: '7.0'
    }
    capabilities: [
      {
        name: 'EnableServerless' // cost: pay-per-request, no provisioned throughput
      }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    publicNetworkAccess: disablePublicAccess ? 'Disabled' : 'Enabled'
    disableLocalAuth: false // Mongo API requires key/connection-string auth
  }
}

resource mongoDatabase 'Microsoft.DocumentDB/databaseAccounts/mongodbDatabases@2024-05-15' = {
  parent: cosmos
  name: databaseName
  properties: {
    resource: {
      id: databaseName
    }
  }
}

@description('Cosmos account name (pipeline uses this to fetch the connection string)')
output accountName string = cosmos.name

@description('Cosmos account resource ID (for private endpoint)')
output id string = cosmos.id

@description('Mongo database name')
output databaseName string = databaseName
