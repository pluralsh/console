import { gql } from "apollo-boost";

export const DashboardFragment = gql`
  fragment DashboardFragment on Dashboard {
    id
    spec {
      name
      description
      timeslices
      labels {
        name
      }
      graphs {
        queries {
          query
          legend
        }
        name
      }
    }
  }
`;

export const DASHBOARDS_Q = gql`
  query Dashboards($repo: String!) {
    dashboards(repo: $repo) {
      id
      spec {
        name
      }
    }
  }
`

export const DASHBOARD_Q = gql`
  query Dashboard($repo: String!, $name: String!) {
    dashboard(repo: $repo, name: $name) {
      ...DashboardFragment
    }
  }
  ${DashboardFragment}
`