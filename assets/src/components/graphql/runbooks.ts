import { gql } from 'apollo-boost'

import { UserFragment } from './users'

export const RunbookAlertStatus = gql`
  fragment RunbookAlertStatus on RunbookAlertStatus {
    name
    startsAt
    labels
    annotations
    fingerprint
  }
`

export const RunbookExecutionFragment = gql`
  fragment RunbookExecutionFragment on RunbookExecution {
    id
    name
    namespace
    context
    user {
      ...UserFragment
    }
    insertedAt
  }
  ${UserFragment}
`
