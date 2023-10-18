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

export const EventFragment = gql`
  fragment EventFragment on Event {
    action
    lastTimestamp
    count
    message
    reason
    type
  }
`

export const ContainerStatus = gql`
  fragment ContainerStatus on ContainerStatus {
    restartCount
    ready
    name
    state {
      running {
        startedAt
      }
      terminated {
        exitCode
        message
        reason
      }
      waiting {
        message
        reason
      }
    }
  }
`

export const ResourcesFragment = gql`
  fragment ResourcesFragment on Resources {
    limits {
      cpu
      memory
    }
    requests {
      cpu
      memory
    }
  }
`

export const Container = gql`
  fragment Container on Container {
    name
    image
    ports {
      containerPort
      protocol
    }
    resources {
      ...ResourcesFragment
    }
  }
  ${ResourcesFragment}
`

export const PodMiniFragment = gql`
  fragment PodMiniFragment on Pod {
    metadata {
      ...MetadataFragment
    }
    status {
      phase
      podIp
      reason
      containerStatuses {
        ...ContainerStatus
      }
      initContainerStatuses {
        ...ContainerStatus
      }
      conditions {
        lastProbeTime
        lastTransitionTime
        message
        reason
        status
        type
      }
    }
    spec {
      nodeName
      serviceAccountName
      containers {
        ...Container
      }
      initContainers {
        ...Container
      }
    }
  }
  ${Container}
  ${ContainerStatus}
  ${MetadataFragment}
`

export const PodFragment = gql`
  fragment PodFragment on Pod {
    metadata {
      ...MetadataFragment
    }
    status {
      phase
      podIp
      reason
      containerStatuses {
        ...ContainerStatus
      }
      initContainerStatuses {
        ...ContainerStatus
      }
      conditions {
        lastProbeTime
        lastTransitionTime
        message
        reason
        status
        type
      }
    }
    spec {
      nodeName
      serviceAccountName
      containers {
        ...Container
      }
      initContainers {
        ...Container
      }
    }
    raw
  }
  ${Container}
  ${ContainerStatus}
  ${MetadataFragment}
`

export const DeploymentFragment = gql`
  fragment DeploymentFragment on Deployment {
    metadata {
      ...MetadataFragment
    }
    status {
      availableReplicas
      replicas
      unavailableReplicas
    }
    spec {
      replicas
      strategy {
        type
      }
    }
    raw
  }
  ${MetadataFragment}
`

export const StatefulSetFragment = gql`
  fragment StatefulSetFragment on StatefulSet {
    metadata {
      ...MetadataFragment
    }
    status {
      replicas
      currentReplicas
      readyReplicas
      updatedReplicas
    }
    spec {
      replicas
      serviceName
    }
    raw
  }
  ${MetadataFragment}
`

export const NodeFragment = gql`
  fragment NodeFragment on Node {
    metadata {
      ...MetadataFragment
    }
    status {
      phase
      allocatable
      capacity
      conditions {
        type
        status
        message
      }
    }
    spec {
      podCidr
      providerId
    }
  }
  ${MetadataFragment}
`

export const NodeMetricFragment = gql`
  fragment NodeMetricFragment on NodeMetric {
    metadata {
      ...MetadataFragment
    }
    usage {
      cpu
      memory
    }
    timestamp
    window
  }
`

export const JobStatus = gql`
  fragment JobStatus on JobStatus {
    active
    completionTime
    succeeded
    failed
    startTime
  }
`

export const JobFragment = gql`
  fragment JobFragment on Job {
    metadata {
      ...MetadataFragment
    }
    status {
      ...JobStatus
    }
    spec {
      backoffLimit
      parallelism
      activeDeadlineSeconds
    }
    pods {
      ...PodFragment
    }
    raw
  }
  ${MetadataFragment}
  ${PodFragment}
  ${JobStatus}
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

export const ConfigurationOverlayFragment = gql`
  fragment ConfigurationOverlayFragment on ConfigurationOverlay {
    metadata {
      ...MetadataFragment
    }
    spec {
      name
      folder
      subfolder
      documentation
      inputType
      inputValues
      updates {
        path
      }
    }
  }
  ${MetadataFragment}
`

export const ContainerResourcesFragment = gql`
  fragment ContainerResourcesFragment on ContainerResources {
    cpu
    memory
  }
`

export const VerticalPodAutoscalerFragment = gql`
  fragment VerticalPodAutoscalerFragment on VerticalPodAutoscaler {
    metadata {
      ...MetadataFragment
    }
    status {
      recommendation {
        containerRecommendations {
          containerName
          lowerBound {
            ...ContainerResourcesFragment
          }
          upperBound {
            ...ContainerResourcesFragment
          }
          uncappedTarget {
            ...ContainerResourcesFragment
          }
        }
      }
    }
  }
  ${MetadataFragment}
  ${ContainerResourcesFragment}
`
