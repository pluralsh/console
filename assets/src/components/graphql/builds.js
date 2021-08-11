import { gql } from 'apollo-boost'
import { UserFragment } from './users';

export const BuildFragment = gql`
  fragment BuildFragment on Build {
    id
    repository
    type
    sha
    status
    message
    insertedAt
    completedAt
    creator {
      ...UserFragment
    }
    approver {
      ...UserFragment
    }
  }
  ${UserFragment}
`;

export const CommandFragment = gql`
  fragment CommandFragment on Command {
    id
    command
    exitCode
    stdout
    completedAt
    insertedAt
  }
`;

export const ChangelogFragment = gql`
  fragment ChangelogFragment on Changelog {
    id
    repo
    tool
    content
  }
`

export const BUILDS_Q = gql`
  query Builds($cursor: String) {
    builds(first: 15, after: $cursor) {
      pageInfo {
        endCursor
        hasNextPage
      }
      edges {
        node {
          ...BuildFragment
        }
      }
    }
  }
  ${BuildFragment}
`;

export const BUILD_Q = gql`
  query Build($buildId: ID!) {
    build(id: $buildId) {
      ...BuildFragment
      commands(first: 100) {
        edges {
          node {
            ...CommandFragment
          }
        }
      }
      changelogs {
        ...ChangelogFragment
      }
    }
  }
  ${BuildFragment}
  ${CommandFragment}
  ${ChangelogFragment}
`;

export const CREATE_BUILD = gql`
  mutation CreateBuild($attributes: BuildAttributes!) {
    createBuild(attributes: $attributes) {
      ...BuildFragment
    }
  }
  ${BuildFragment}
`;

export const CANCEL_BUILD = gql`
  mutation CancelBuild($id: ID!) {
    cancelBuild(id: $id) {
      ...BuildFragment
    }
  }
  ${BuildFragment}
`;

export const APPROVE_BUILD = gql`
  mutation ApproveBuild($id: ID!) {
    approveBuild(id: $id) {
      ...BuildFragment
    }
  }
  ${BuildFragment}
`

export const RESTART_BUILD = gql`
  mutation Restart($id: ID!) {
    restartBuild(id: $id) { ...BuildFragment }
  }
  ${BuildFragment}
`;

export const BUILD_SUB = gql`
  subscription BuildSub($buildId: ID) {
    buildDelta(buildId: $buildId) {
      delta
      payload {
        ...BuildFragment
        changelogs {
          ...ChangelogFragment
        }
      }
    }
  }
  ${BuildFragment}
  ${ChangelogFragment}
`;

export const COMMAND_SUB = gql`
  subscription CommandSubs($buildId: ID!) {
    commandDelta(buildId: $buildId) {
      delta
      payload {
        ...CommandFragment
      }
    }
  }
  ${CommandFragment}
`;