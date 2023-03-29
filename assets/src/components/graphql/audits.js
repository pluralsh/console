import { gql } from 'apollo-boost'

import { UserFragment } from './users'

export const AuditFragment = gql`
  fragment AuditFragment on Audit {
    id
    type
    action
    repository
    ip
    city
    country
    latitude
    longitude
    actor {
      ...UserFragment
    }
    insertedAt
  }
  ${UserFragment}
`
