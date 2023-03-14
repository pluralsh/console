import { gql } from '@apollo/client'

// TODO: Add grandfatheredUntil delinquentAt back once API will be fixed.
export const SUBSCRIPTION_QUERY = gql`
  query {
    account {
      availableFeatures { audits userManagement  vpn }
      subscription {
        id
        plan { id name period }
      }
    }
  }
`
