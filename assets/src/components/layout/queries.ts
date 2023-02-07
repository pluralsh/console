import { gql } from '@apollo/client'
import { NotificationFragment, UserFragment } from 'components/graphql/users'

export const MARK_READ = gql`
  mutation {
    readNotifications {
      ...UserFragment
    }
  }
  ${UserFragment}
`

export const NOTIFS_SUB = gql`
  subscription {
    notificationDelta { delta payload { ...NotificationFragment } }
  }
  ${NotificationFragment}
`
