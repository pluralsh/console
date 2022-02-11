import { gql } from "apollo-boost";
import { UserFragment } from "./incidents";

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
      user { ...UserFragment }
      group { ...GroupFragment }
    }
  }
  ${UserFragment}
  ${GroupFragment}
`;