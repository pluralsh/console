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
      grandfatheredUntil
      availableFeatures { userManagement audit vpn }
      subscription {
        id
        plan {
          id
          period
          lineItems { dimension cost }
        }
      }
    }
  }
`
