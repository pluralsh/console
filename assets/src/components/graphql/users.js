import { gql } from 'apollo-boost'

import { PageInfo } from './base'

export const UserFragment = gql`
  fragment UserFragment on User {
    id
    name
    email
    profile
    backgroundColor
    readTimestamp
    roles { admin }
  }
`
export const InviteFragment = gql`
  fragment InviteFragment on Invite {
    secureId
  }
`

export const GroupFragment = gql`
  fragment GroupFragment on Group {
    id
    name
    description
    insertedAt
  }
`

export const RoleBindingFragment = gql`
  fragment RoleBindingFragment on RoleBinding {
    id
    user { ...UserFragment }
    group { ...GroupFragment }
  }
  ${UserFragment}
  ${GroupFragment}
`

export const RoleFragment = gql`
  fragment RoleFragment on Role {
    id
    name
    description
    repositories
    permissions
    roleBindings { ...RoleBindingFragment }
  }
  ${RoleBindingFragment}
`

export const GroupMemberFragment = gql`
  fragment GroupMemberFragment on GroupMember {
    user { ...UserFragment }
    group { ...GroupFragment }
  }
  ${GroupFragment}
  ${UserFragment}
`

export const ManifestFragment = gql`
  fragment ManifestFragment on PluralManifest {
    network { 
      pluralDns
      subdomain
    }
    cluster
    bucketPrefix
  }
`
export const NotificationFragment = gql`
  fragment NotificationFragment on Notification {
    id
    title
    description
    repository
    severity
    labels
    annotations
    seenAt
  }
`
export const ME_Q = gql`
  query Me{
    me {
      ...UserFragment
      boundRoles { ...RoleFragment }
      unreadNotifications
    }
    externalToken
    clusterInfo { version platform gitCommit }
    configuration { 
      gitCommit
      isDemoProject
      manifest { ...ManifestFragment }
      gitStatus { cloned output }
    }
  }
  ${UserFragment}
  ${RoleFragment}
  ${ManifestFragment}
`

export const SIGNIN = gql`
  mutation signIn($email: String!, $password: String!) {
    signIn(email: $email, password: $password) {
      ...UserFragment
      jwt
    }
  }
  ${UserFragment}
`

export const UPDATE_USER = gql`
  mutation UpdateUser($attributes: UserAttributes!) {
    updateUser(attributes: $attributes) {
      ...UserFragment
    }
  }
  ${UserFragment}
`

export const USERS_Q = gql`
  query Users($cursor: String) {
    users(first: 20, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          ...UserFragment
        }
      }
    }
  }
  ${UserFragment}
`

export const INVITE_USER = gql`
  mutation InviteUser($email: String) {
    createInvite(attributes: {email: $email}) {
      ...InviteFragment
    }
  }
  ${InviteFragment}
`

export const INVITE_Q = gql`
  query Invite($id: String!) {
    invite(id: $id) {
      email
    }
  }
`
export const SIGNUP = gql`
  mutation SignUp($inviteId: String!, $attributes: UserAttributes!) {
    signup(inviteId: $inviteId, attributes: $attributes) {
      ...UserFragment
      jwt
    }
  }
  ${UserFragment}
`

export const NOTIFICATIONS_Q = gql`
  query Notifs($all: Boolean, $cursor: String) {
    notifications(all: $all, after: $cursor, first: 50) {
      pageInfo { ...PageInfo }
      edges { node { ...NotificationFragment } }
    }
  }
  ${PageInfo}
  ${NotificationFragment}
`
