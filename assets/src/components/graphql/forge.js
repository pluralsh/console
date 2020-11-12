import { gql } from 'apollo-boost'

export const RepositoryFragment = gql`
  fragment RepositoryFragment on Repository {
    id
    name
    description
    icon
  }
`;

export const InstallationFragment = gql`
  fragment InstallationFragment on Installation {
    id
    repository {
      ...RepositoryFragment
    }
  }
  ${RepositoryFragment}
`;

export const INSTALLATION_Q = gql`
  query Installations($cursor: String) {
    installations(first: 20, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          ...InstallationFragment
        }
      }
    }
  }
  ${InstallationFragment}
`;

export const CONFIGURATIONS_Q = gql`
  query Installations($cursor: String) {
    installations(first: 20, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          repository {
            ...RepositoryFragment
            configuration
            grafanaDns
          }
        }
      }
    }
  }
  ${RepositoryFragment}
`;

export const ApplicationFragment = gql`
  fragment ApplicationFragment on Application {
    name
    spec {
      descriptor {
        type
        icons
        description
        version
      }
      components {
        group
        kind
      }
    }
    status {
      components {
        group
        kind
        name
        status
      }
      conditions {
        message
        reason
        status
        type
      }
      componentsReady
    }
  }
`

export const UPDATE_CONFIGURATION = gql`
  mutation UpdateConfiguration($repository: String!, $content: String!, $type: Tool) {
    updateConfiguration(repository: $repository, content: $content, tool: $type) {
      helm
      terraform
    }
  }
`;

export const APPLICATIONS_Q = gql`
  query {
    applications {
      ...ApplicationFragment
    }
  }
  ${ApplicationFragment}
`;

export const APPLICATION_Q = gql`
  query App($name: String!) {
    application(name: $name) {
      configuration { helm terraform }
      ...ApplicationFragment
    }
  }
  ${ApplicationFragment}
`

export const APPLICATION_SUB = gql`
  subscription {
    applicationDelta {
      delta
      payload {
        ...ApplicationFragment
      }
    }
  }
  ${ApplicationFragment}
`;