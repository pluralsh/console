import { gql } from 'apollo-boost'

export const UserFragment = gql`
  fragment UserFragment on User {
    id
    name
    email
    avatar
    backgroundColor
  }
`;

export const ClusterInformation = gql`
  fragment ClusterInformation on ClusterInformation {
    gitCommit
    version
    platform
  }
`

export const RepoFragment = gql`
  fragment RepoFragment on Repository {
    id
    name
    description
    documentation
    icon
    private
  }
`;

export const PlanFragment = gql`
  fragment PlanFragment on Plan {
    id
    name
    cost
    period
    lineItems {
      included { dimension quantity }
      items { name dimension cost period }
    }
    metadata { features { name description } }
  }
`;

export const PostmortemFragment = gql`
  fragment PostmortemFragment on Postmortem {
    id
    content
    actionItems { type link }
  }
`
export const FollowerFragment = gql`
  fragment FollowerFragment on Follower {
    id
    incident { id }
    user { ...UserFragment }
    preferences { message incidentUpdate }
  }
  ${UserFragment}
`

export const SubscriptionFragment = gql`
  fragment SubscriptionFragment on SlimSubscription {
    id
    lineItems { items { dimension quantity } }
    plan { ...PlanFragment }
  }
  ${PlanFragment}
`

export const IncidentFragment = gql`
  fragment IncidentFragment on Incident {
    id
    title
    description
    severity
    status
    notificationCount
    creator { ...UserFragment }
    owner { ...UserFragment }
    repository { ...RepoFragment }
    subscription { ...SubscriptionFragment }
    clusterInformation { ...ClusterInformation }
    tags { tag }
    insertedAt
  }
  ${UserFragment}
  ${RepoFragment}
  ${SubscriptionFragment}
  ${ClusterInformation}
`

export const IncidentHistoryFragment = gql`
  fragment IncidentHistoryFragment on IncidentHistory {
    id
    action
    changes { key prev next }
    actor { ...UserFragment }
  }
  ${UserFragment}
`

export const FileFragment = gql`
  fragment FileFragment on File {
    id
    blob
    mediaType
    contentType
    filesize
    filename
  }
`

export const IncidentMessageFragment = gql`
  fragment IncidentMessageFragment on IncidentMessage {
    id
    text
    creator { ...UserFragment }
    reactions { name creator { id email } }
    file { ...FileFragment }
    entities { type user { ...UserFragment } text startIndex endIndex }
    insertedAt
  }
  ${UserFragment}
  ${FileFragment}
`

export const NotificationFragment = gql`
  fragment NotificationFragment on Notification {
    id
    type
    actor { ...UserFragment }
    incident { id }
  }
  ${UserFragment}
`