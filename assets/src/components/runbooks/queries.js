import gql from "graphql-tag";
import { RunbookDataFragment, RunbookFragment } from "../graphql/runbooks";

export const RUNBOOKS_Q = gql`
  query Runbooks($namespace: String!) {
    runbooks(namespace: $namespace) {
      ...RunbookFragment
    }
  }
  ${RunbookFragment}
`;

export const RUNBOOK_Q = gql`
  query Runbooks($namespace: String!, $name: String!) {
    runbook(namespace: $namespace, name: $name) {
      name
      spec {
        name
        description
        display
      }
      data { ...RunbookDataFragment }
    }
  }
  ${RunbookDataFragment}
`

export const EXECUTE_RUNBOOK = gql`
  mutation Execute($name: String!, $namespace: String!, $input: RunbookActionInput!) {
    executeRunbook(name: $name, namespace: $namespace, input: $input) {
      redirectTo
    }
  }
`;