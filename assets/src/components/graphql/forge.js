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
  mutation UpdateConfiguration($repository: String!, $content: String!) {
    updateConfiguration(repository: $repository, content: $content) {
      configuration
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