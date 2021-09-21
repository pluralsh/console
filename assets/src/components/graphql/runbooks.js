import { gql } from 'apollo-boost'
import { MetricResponseFragment } from './dashboards'
import { StatefulSetFragment, DeploymentFragment } from "./kubernetes"

export const RunbookFragment = gql`
  fragment RunbookFragment on Runbook {
    name
    spec {
      name
      description
    }
  }
`

export const RunbookDataFragment = gql`
  fragment RunbookDataFragment on RunbookData {
    name
    prometheus { ...MetricResponseFragment }
    kubernetes {
      __typename
      ... on StatefulSet { ...StatefulSetFragment }
      ... on Deployment { ...DeploymentFragment }
    }
  }
  ${MetricResponseFragment}
  ${StatefulSetFragment}
  ${DeploymentFragment}
`