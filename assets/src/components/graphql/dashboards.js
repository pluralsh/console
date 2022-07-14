import { gql } from 'apollo-boost'

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
        format
        name
      }
    }
  }
`

export const LogStreamFragment = gql`
  fragment LogStreamFragment on LogStream {
    stream
    values {
      timestamp
      value
    }
  }
`

export const MetricResponseFragment = gql`
  fragment MetricResponseFragment on MetricResponse {
    metric
    values {
      timestamp
      value
    }
  }
`

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
  query Dashboard($repo: String!, $name: String!, $step: String, $offset: Int, $labels: [LabelInput]) {
    dashboard(repo: $repo, name: $name, step: $step, offset: $offset, labels: $labels) {
      ...DashboardFragment
    }
  }
  ${DashboardFragment}
`

export const LOGS_Q = gql`
  query Logs($query: String!, $start: Long) {
    logs(query: $query, start: $start, limit: 200) {
      ...LogStreamFragment
    }
  }
  ${LogStreamFragment}
`

export const METRICS_Q = gql`
  query Metrics($query: String!, $offset: Int) {
    metric(query: $query, offset: $offset) {
      ...MetricResponseFragment
    }
  }
  ${MetricResponseFragment}
`
