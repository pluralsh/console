import { gql } from 'apollo-boost'

import {
  ConfigurationOverlayFragment,
  EventFragment,
  JobFragment,
  NodeFragment,
  NodeMetricFragment,
  PodFragment,
  VerticalPodAutoscalerFragment,
} from 'components/graphql/kubernetes'

export const DELETE_POD = gql`
  mutation DeletePod($name: String!, $namespace: String!, $serviceId: ID) {
    deletePod(name: $name, namespace: $namespace, serviceId: $serviceId) {
      ...PodFragment
    }
  }
  ${PodFragment}
`

export const DELETE_JOB = gql`
  mutation DeleteJob($name: String!, $namespace: String!) {
    deleteJob(name: $name, namespace: $namespace) {
      ...JobFragment
    }
  }
  ${JobFragment}
`

export const DELETE_NODE = gql`
  mutation DeleteNode($name: String!) {
    deleteNode(name: $name) {
      ...NodeFragment
    }
  }
  ${NodeFragment}
`

export const NODES_Q = gql`
  query {
    nodes {
      ...NodeFragment
    }
    nodeMetrics {
      ...NodeMetricFragment
    }
  }
  ${NodeFragment}
  ${NodeMetricFragment}
`

export const NODE_Q = gql`
  query Node($name: String!) {
    node(name: $name) {
      ...NodeFragment
      raw
      pods {
        ...PodFragment
      }
      events {
        ...EventFragment
      }
    }
    nodeMetric(name: $name) {
      ...NodeMetricFragment
    }
  }
  ${NodeFragment}
  ${PodFragment}
  ${EventFragment}
  ${NodeMetricFragment}
`

export const NODE_EVENTS_Q = gql`
  query NodeEvents($name: String!) {
    node(name: $name) {
      events {
        ...EventFragment
      }
    }
  }
  ${EventFragment}
`

export const NODE_RAW_Q = gql`
  query NodeRaw($name: String!) {
    node(name: $name) {
      raw
    }
  }
`

export const SCALING_RECOMMENDATION = gql`
  query Scaling(
    $name: String!
    $namespace: String!
    $kind: AutoscalingTarget!
  ) {
    scalingRecommendation(name: $name, namespace: $namespace, kind: $kind) {
      ...VerticalPodAutoscalerFragment
    }
  }
  ${VerticalPodAutoscalerFragment}
`

export const CONFIGURATION_OVERLAYS = gql`
  query Overlays($namespace: String!) {
    configurationOverlays(namespace: $namespace) {
      ...ConfigurationOverlayFragment
    }
  }
  ${ConfigurationOverlayFragment}
`
