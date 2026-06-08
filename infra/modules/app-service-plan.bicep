// app-service-plan.bicep — Linux App Service Plan (parameterised SKU)
// Cost: B2 (~$26/mo) for staging, P1v2 (~$70/mo) for prod. Hosts all 3 container apps.
// Note: B-tier supports Always On + VNet integration but NOT deployment slots
//       (S1+ required for blue-green slot swaps — see docs/azure/pipeline.md).

@description('App Service Plan name')
param name string

@description('Azure region')
param location string

@description('Resource tags')
param tags object

@description('SKU name, e.g. B2 (staging) or P1v2 (prod)')
param skuName string = 'B2'

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: skuName
  }
  kind: 'linux'
  properties: {
    reserved: true // Required for Linux
  }
}

@description('App Service Plan resource ID')
output id string = plan.id
