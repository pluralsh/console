import { gql } from 'apollo-boost'
import { PageInfo } from 'components/graphql/base'
import { GroupFragment, OIDCProvider } from 'components/graphql/oauth'

export const SEARCH_USERS = gql`
  query SearchUsers($q: String, $cursor: String) {
    users(q: $q, after: $cursor, first: 5, all: true) {
      pageInfo { ...PageInfo }
      edges {
        node { 
          id
          name
          email
          roles { admin }
         }
      }
    }
  }
  ${PageInfo}
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
