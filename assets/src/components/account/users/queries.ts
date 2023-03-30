import { gql } from 'apollo-boost'

import { PageInfo } from '../../graphql/base'
import { InviteFragment, UserFragment } from '../../graphql/users'

export const USERS_Q = gql`
  query Users($q: String, $cursor: String) {
    users(q: $q, first: 20, after: $cursor) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...UserFragment
        }
      }
    }
  }
  ${PageInfo}
  ${UserFragment}
`

export const SEARCH_USERS = gql`
  query SearchUsers($q: String, $cursor: String) {
    users(q: $q, after: $cursor, first: 5) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...UserFragment
        }
      }
    }
  }
  ${PageInfo}
  ${UserFragment}
`

export const EDIT_USER = gql`
  mutation UpdateUser($id: ID, $attributes: UserAttributes!) {
    updateUser(id: $id, attributes: $attributes) {
      ...UserFragment
    }
  }
  ${UserFragment}
`

export const CREATE_INVITE = gql`
  mutation CreateInvite($attributes: InviteAttributes!) {
    createInvite(attributes: $attributes) {
      ...InviteFragment
    }
  }
  ${InviteFragment}
`
