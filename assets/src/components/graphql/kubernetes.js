import { gql } from 'apollo-boost'

export const MetadataFragment = gql`
  fragment MetadataFragment on Metadata {
    name
    namespace
    labels { name value }
    annotations { name value }
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
`;

export const ResultStatus = gql`
  fragment ResultStatus on ResultStatus {
    message
    reason
    status
  }
`;

export const ContainerStatus = gql`
  fragment ContainerStatus on ContainerStatus {
    restartCount
    ready
    name
    state {
      running { startedAt }
      terminated { exitCode message reason }
      waiting { message reason }
    }
  }
`

export const Container = gql`
  fragment Container on Container {
    name
    image
    ports { containerPort protocol }
    resources {
      limits { cpu memory }
      requests { cpu memory }
    }
  }
`

export const PodFragment = gql`
  fragment PodFragment on Pod {
    metadata { ...MetadataFragment }
    status {
      phase
      podIp
      reason
      containerStatuses { ...ContainerStatus }
      initContainerStatuses { ...ContainerStatus }
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
      containers { ...Container }
      initContainers { ...Container }
    }
    raw
  }
  ${Container}
  ${ContainerStatus}
  ${MetadataFragment}
`;

export const DeploymentFragment = gql`
  fragment DeploymentFragment on Deployment {
    metadata { ...MetadataFragment }
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
`;

export const StatefulSetFragment = gql`
  fragment StatefulSetFragment on StatefulSet {
    metadata { ...MetadataFragment }
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
`;

export const ServiceFragment = gql`
  fragment ServiceFragment on Service {
    metadata { ...MetadataFragment }
    status {
      loadBalancer {
        ingress { ip }
      }
    }
    spec {
      type
      clusterIp
      ports {
        name
        protocol
        port
        targetPort
      }
    }
    raw
  }
  ${MetadataFragment}
`

export const IngressFragment = gql`
  fragment IngressFragment on Ingress {
    metadata { ...MetadataFragment }
    status {
      loadBalancer {
        ingress { ip }
      }
    }
    spec {
      tls { hosts }
      rules {
        host
        http {
          paths {
            path
            backend { serviceName servicePort }
          }
        }
      }
    }
    raw
  }
  ${MetadataFragment}
`

export const NodeFragment = gql`
  fragment NodeFragment on Node {
    metadata { ...MetadataFragment }
    status {
      phase
      allocatable
      capacity
      conditions { type status message }
    }
    spec { podCidr providerId }
  }
  ${MetadataFragment}
`;

export const NodeMetricFragment = gql`
  fragment NodeMetricFragment on NodeMetric {
    metadata { ...MetadataFragment }
    usage { cpu memory }
    timestamp
    window
  }
`

export const CronJobFragment = gql`
  fragment CronJobFragment on CronJob {
    metadata { ...MetadataFragment }
    status { lastScheduleTime }
    spec { schedule suspend concurrencyPolicy }
    raw
  }
  ${MetadataFragment}
`;

export const JobStatus = gql`
  fragment JobStatus on JobStatus {
    active
    completionTime
    succeeded
    failed
    startTime
  }
`;

export const JobFragment = gql`
  fragment JobFragment on Job {
    metadata { ...MetadataFragment }
    status { ...JobStatus }
    spec { backoffLimit parallelism activeDeadlineSeconds }
    pods { ...PodFragment }
    raw
  }
  ${MetadataFragment}
  ${PodFragment}
  ${JobStatus}
`;

export const LogFilterFragment = gql`
  fragment LogFilterFragment on LogFilter {
    metadata {  ...MetadataFragment }
    spec {
      name
      description
      query
      labels { name value }
    }
  }
  ${MetadataFragment}
`;

export const CertificateFragment = gql`
  fragment CertificateFragment on Certificate {
    metadata { ...MetadataFragment }
    status { renewalTime notBefore notAfter }
    spec { 
      dnsNames 
      secretName 
      issuerRef { group kind name }
    }
    raw
  }
  ${MetadataFragment}
`