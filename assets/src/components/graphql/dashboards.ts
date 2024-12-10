import { gql } from 'apollo-boost'

export const LogStreamFragment = gql`
  fragment LogStreamFragment on LogStream {
    stream
    values {
      timestamp
      value
    }
  }
`

export const LOGS_Q = gql`
  query Logs($query: String!, $start: Long, $limit: Int!) {
    logs(query: $query, start: $start, limit: $limit) {
      ...LogStreamFragment
    }
  }
  ${LogStreamFragment}
`
