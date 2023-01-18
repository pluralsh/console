import { gql } from 'apollo-boost'

import { PageInfo } from '../../graphql/base'
import { RoleFragment } from '../../graphql/users'

export const ROLES_Q = gql`
  query Roles($cursor: String) {
    roles(first: 20, after: $cursor) {
      pageInfo { ...PageInfo }
      edges {
        node { ...RoleFragment }
      }
    }
  }
  ${PageInfo}
  ${RoleFragment}
`

export const CREATE_ROLE = gql`
  mutation CreateRole($attributes: RoleAttributes!) {
    createRole(attributes: $attributes) {
      ...RoleFragment
    }
  }
  ${RoleFragment}
`

export const UPDATE_ROLE = gql`
  mutation UpdateRole($id: ID!, $attributes: RoleAttributes!) {
    updateRole(id: $id, attributes: $attributes) {
      ...RoleFragment
    }
  }
  ${RoleFragment}
`

export const DELETE_ROLE = gql`
  mutation DeleteRow($id: ID!) {
    deleteRole(id: $id) {
      ...RoleFragment
    }
  }
  ${RoleFragment}
`
