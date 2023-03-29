import { BuildFragment } from 'components/graphql/builds'
import gql from 'graphql-tag'

export const EXECUTE_OVERLAY = gql`
  mutation Execute($name: String!, $ctx: Map!) {
    overlayConfiguration(namespace: $name, context: $ctx) {
      ...BuildFragment
    }
  }
  ${BuildFragment}
`
