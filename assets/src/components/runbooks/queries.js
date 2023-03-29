import gql from 'graphql-tag'

import { PageInfo } from '../graphql/base'
import {
  RunbookAlertStatus,
  RunbookDataFragment,
  RunbookExecutionFragment,
  RunbookFragment,
} from '../graphql/runbooks'

export const RUNBOOKS_Q = gql`
  query Runbooks($namespace: String!, $pinned: Boolean) {
    runbooks(namespace: $namespace, pinned: $pinned) {
      ...RunbookFragment
    }
  }
  ${RunbookFragment}
`

export const RUNBOOK_Q = gql`
  query Runbooks(
    $namespace: String!
    $name: String!
    $context: RunbookContext
  ) {
    runbook(namespace: $namespace, name: $name) {
      name
      status {
        alerts {
          ...RunbookAlertStatus
        }
      }
      spec {
        name
        description
        display
      }
      data(context: $context) {
        ...RunbookDataFragment
      }
    }
  }
  ${RunbookAlertStatus}
  ${RunbookDataFragment}
`

export const RUNBOOK_EXECUTIONS_Q = gql`
  query Runbooks($namespace: String!, $name: String!, $cursor: String) {
    runbook(namespace: $namespace, name: $name) {
      executions(first: 20, after: $cursor) {
        pageInfo {
          ...PageInfo
        }
        edges {
          node {
            ...RunbookExecutionFragment
          }
        }
      }
    }
  }
  ${PageInfo}
  ${RunbookExecutionFragment}
`

export const EXECUTE_RUNBOOK = gql`
  mutation Execute(
    $name: String!
    $namespace: String!
    $input: RunbookActionInput!
  ) {
    executeRunbook(name: $name, namespace: $namespace, input: $input) {
      redirectTo
    }
  }
`
