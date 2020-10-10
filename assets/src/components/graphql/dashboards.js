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
        values
      }
      graphs {
        queries {
          query
          legend
          results {
            timestamp
            value
          }
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
        description
      }
    }
  }
`

export const DASHBOARD_Q = gql`
  query Dashboard($repo: String!, $name: String!, $labels: [LabelInput]) {
    dashboard(repo: $repo, name: $name, labels: $labels) {
      ...DashboardFragment
    }
  }
  ${DashboardFragment}
`