import { gql } from 'apollo-boost'

import { UserFragment } from './users'

export const BuildFragment = gql`
  fragment BuildFragment on Build {
    id
    repository
    type
    sha
    status
    message
    insertedAt
    completedAt
    creator {
      ...UserFragment
    }
    approver {
      ...UserFragment
    }
  }
  ${UserFragment}
`
