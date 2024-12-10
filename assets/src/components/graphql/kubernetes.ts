import { gql } from 'apollo-boost'

export const MetadataFragment = gql`
  fragment MetadataFragment on Metadata {
    name
    namespace
    labels {
      name
      value
    }
    annotations {
      name
      value
    }
  }
`

export const LogFilterFragment = gql`
  fragment LogFilterFragment on LogFilter {
    metadata {
      ...MetadataFragment
    }
    spec {
      name
      description
      query
      labels {
        name
        value
      }
    }
  }
  ${MetadataFragment}
`
