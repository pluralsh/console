import { gql } from 'apollo-boost'

export const MetadataFragment = gql`
  fragment MetadataFragment on Metadata {
    name
    labels { name value }
    annotations { name value }
  }
`

export const ResultStatus = gql`
  fragment ResultStatus on ResultStatus {
    message
    reason
    status
  }
`;

export const PodFragment = gql`
  fragment PodFragment on Pod {
    metadata { ...MetadataFragment }
    status {
      phase
      podIp
      reason
      containerStatuses { restartCount }
    }
    spec {
      nodeName
      serviceAccountName
      containers {
        image
        ports { containerPort protocol }
        resources {
          limits { cpu memory }
          requests { cpu memory }
        }
      }
    }
  }
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
  }
  ${MetadataFragment}
`