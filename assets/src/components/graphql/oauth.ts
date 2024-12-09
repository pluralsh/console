import { gql } from 'apollo-boost'

export const UserFragment = gql`
  fragment UserFragment on User {
    id
    name
    email
    avatar
    backgroundColor
  }
`

export const GroupFragment = gql`
  fragment GroupFragment on Group {
    id
    name
    description
  }
`

export const OIDCProvider = gql`
  fragment OIDCProvider on OidcProvider {
    id
    clientId
    authMethod
    clientSecret
    redirectUris
    bindings {
      id
      user {
        ...UserFragment
      }
      group {
        ...GroupFragment
      }
    }
  }
  ${UserFragment}
  ${GroupFragment}
`
