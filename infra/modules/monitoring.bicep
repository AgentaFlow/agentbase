// monitoring.bicep — Log Analytics workspace + Application Insights
// Cost: Log Analytics & App Insights are pay-as-you-go (per GB ingested);
//       a daily cap is set to bound cost. First 5 GB/month is free.

@description('Base name for monitoring resources')
param name string

@description('Azure region')
param location string

@description('Resource tags')
param tags object

@description('Daily ingestion cap in GB (cost guardrail)')
param dailyQuotaGb int = 1

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-${name}'
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
    workspaceCapping: {
      dailyQuotaGb: dailyQuotaGb
    }
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-${name}'
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    IngestionMode: 'LogAnalytics'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

@description('Application Insights connection string (injected into apps)')
output connectionString string = appInsights.properties.ConnectionString

@description('Log Analytics workspace resource ID (for diagnostic settings)')
output logAnalyticsId string = logAnalytics.id
