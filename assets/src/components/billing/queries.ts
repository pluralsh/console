import { gql } from '@apollo/client'

export const PLATFORM_PLANS_QUERY = gql`
  query PlatformPlans {
    platformPlans {
      id
      name
      cost
      period
      visible
      enterprise
      features {
        vpn
      }
      lineItems {
        name
        dimension
        cost
        period
      }
    }
  }
`

export const SUBSCRIPTION_QUERY = gql`
  query Subscription {
    account {
      billingCustomerId
      grandfatheredUntil
      delinquentAt
      userCount
      clusterCount
      availableFeatures { userManagement audit }
      subscription {
        id
        plan {
          id
          period
          lineItems { dimension cost }
        }
      }
      billingAddress {
        name
        line1
        line2
        zip
        state
        city
        country
      }
    }
  }
`
