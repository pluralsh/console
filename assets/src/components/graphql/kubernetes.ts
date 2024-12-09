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
