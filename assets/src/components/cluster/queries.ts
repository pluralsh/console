import { gql } from 'apollo-boost'

import {
  ConfigurationOverlayFragment,
  JobFragment,
  NodeFragment,
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
