import { gql } from 'apollo-boost'

import { MetricResponseFragment } from 'components/graphql/dashboards'
import {
  ConfigurationOverlayFragment,
  EventFragment,
  JobFragment,
  MetadataFragment,
  NodeFragment,
  NodeMetricFragment,
  PodFragment,
  PodMiniFragment,
  VerticalPodAutoscalerFragment,
} from 'components/graphql/kubernetes'

export const DELETE_POD = gql`
  mutation DeletePod($name: String!, $namespace: String!) {
    deletePod(name: $name, namespace: $namespace) {
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

export const NODE_METRICS_Q = gql`
  query Metrics(
    $cpuRequests: String!
    $cpuLimits: String!
    $memRequests: String!
    $memLimits: String!
    $pods: String!
    $clusterId: ID
    $offset: Int
  ) {
    cpuRequests: metric(
      clusterId: $clusterId
      query: $cpuRequests
      offset: $offset
    ) {
      ...MetricResponseFragment
    }
    cpuLimits: metric(
      clusterId: $clusterId
      query: $cpuLimits
      offset: $offset
    ) {
      ...MetricResponseFragment
    }
    memRequests: metric(
      clusterId: $clusterId
      query: $memRequests
      offset: $offset
    ) {
      ...MetricResponseFragment
    }
    memLimits: metric(
      clusterId: $clusterId
      query: $memLimits
      offset: $offset
    ) {
      ...MetricResponseFragment
    }
    pods: metric(clusterId: $clusterId, query: $pods, offset: $offset) {
      ...MetricResponseFragment
    }
  }
  ${MetricResponseFragment}
`

export const CLUSTER_SATURATION = gql`
  query Metrics(
    $cpuUtilization: String!
    $memUtilization: String!
    $clusterId: ID
    $offset: Int
  ) {
    cpuUtilization: metric(
      clusterId: $clusterId
      query: $cpuUtilization
      offset: $offset
    ) {
      ...MetricResponseFragment
    }
    memUtilization: metric(
      clusterId: $clusterId
      query: $memUtilization
      offset: $offset
    ) {
      ...MetricResponseFragment
    }
  }
  ${MetricResponseFragment}
`

export const PODS_Q = gql`
  query Pods($namespaces: [String]) {
    cachedPods(namespaces: $namespaces) {
      ...PodMiniFragment
    }
    namespaces {
      metadata {
        ...MetadataFragment
      }
    }
    applications {
      name
      spec {
        descriptor {
          type
          icons
        }
      }
    }
  }
  ${PodMiniFragment}
  ${MetadataFragment}
`

export const PODS_SUB = gql`
  subscription PodsSub {
    podDelta {
      payload {
        ...PodFragment
      }
      delta
    }
  }
  ${PodFragment}
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
