import { gql } from 'apollo-boost'

import { InviteFragment, UserFragment } from '../../graphql/users'

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
