import { gql } from 'apollo-boost'
import { MetricResponseFragment } from './dashboards'
import { StatefulSetFragment, DeploymentFragment, NodeFragment } from "./kubernetes"

export const RunbookFragment = gql`
  fragment RunbookFragment on Runbook {
    name
    spec {
      name
      description
    }
  }
`

export const RunbookDatasourceFragment = gql`
  fragment RunbookDatasourceFragment on RunbookDatasource {
    name
    type
    prometheus { query format legend }
    kubernetes { resource name }
  }
`

export const RunbookDataFragment = gql`
  fragment RunbookDataFragment on RunbookData {
    name
    source { ...RunbookDatasourceFragment }
    prometheus { ...MetricResponseFragment }
    nodes { ...NodeFragment }
    kubernetes {
      __typename
      ... on StatefulSet { ...StatefulSetFragment }
      ... on Deployment { ...DeploymentFragment }
    }
  }
  ${RunbookDatasourceFragment}
  ${MetricResponseFragment}
  ${StatefulSetFragment}
  ${DeploymentFragment}
  ${NodeFragment}
`