import { gql } from 'apollo-boost'

import { AuditFragment } from '../graphql/audits'
import { PageInfo } from '../graphql/base'

export const AUDITS_Q = gql`
  query Audits($repo: String, $cursor: String) {
    audits(repo: $repo, after: $cursor, first: 50) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...AuditFragment
        }
      }
    }
  }
  ${PageInfo}
  ${AuditFragment}
`

export const AUDIT_METRICS = gql`
  query {
    auditMetrics {
      country
      count
    }
  }
`
