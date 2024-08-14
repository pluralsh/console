import { gql } from 'apollo-boost'

import { PageInfo } from '../../graphql/base'
import { RepositoryFragment } from '../../graphql/plural'

// TODO: Add support for query search and virtual scrolling
export const QUERY_REPOS = gql`
  query Repositories {
    repositories(query: "", first: 1000) {
      pageInfo {
        ...PageInfo
      }
      edges {
        node {
          ...RepositoryFragment
        }
      }
    }
  }
  ${PageInfo}
  ${RepositoryFragment}
`
