import { gql } from 'apollo-boost'

import { PageInfo } from '../graphql/base'
import { UserFragment } from '../graphql/incidents'
import { GroupFragment, OIDCProvider } from '../graphql/oauth'

export const SEARCH_USERS = gql`
  query SearchUsers($q: String, $cursor: String) {
    users(q: $q, after: $cursor, first: 5, all: true) {
      pageInfo { ...PageInfo }
      edges {
        node { ...UserFragment }
      }
    }
  }
  ${PageInfo}
  ${UserFragment}
`

export const SEARCH_GROUPS = gql`
  query SearchGroups($q: String, $cursor: String) {
    groups(q: $q, after: $cursor, first: 5) {
      pageInfo { ...PageInfo }
      edges {
        node { ...GroupFragment }
      }
    }
  }
  ${PageInfo}
  ${GroupFragment}
`

export const INSTALLATION = gql`
  query Inst($name: String) {
    installation(name: $name) {
      id
      oidcProvider { ...OIDCProvider }
    }
  }
  ${OIDCProvider}
`

export const UPDATE_PROVIDER = gql`
  mutation Update($id: ID!, $attributes: OidcAttributes!) {
    updateOidcProvider(installationId: $id, attributes: $attributes) {
      ...OIDCProvider
    }
  }
  ${OIDCProvider}
`
