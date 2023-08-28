import { gql } from '@apollo/client'

export const SUBSCRIPTION_QUERY = gql`
  query {
    account {
      grandfatheredUntil
      delinquentAt
      availableFeatures {
        audits
        userManagement
        databaseManagement
        vpn
      }
      subscription {
        id
        plan {
          id
          name
          period
        }
      }
    }
  }
`
