import gql from 'graphql-tag'

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
