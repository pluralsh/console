import { gql } from 'apollo-boost'

import { MetricResponseFragment } from 'components/graphql/dashboards'
import {
  CertificateFragment,
  ConfigurationOverlayFragment,
  CronJobFragment,
  DeploymentFragment,
  EventFragment,
  IngressFragment,
  JobFragment,
  JobStatus,
  NodeFragment,
  NodeMetricFragment,
  PodFragment,
  ServiceFragment,
  StatefulSetFragment,
  VerticalPodAutoscalerFragment,
} from 'components/graphql/kubernetes'

export const SERVICE_Q = gql`
  query Service($name: String!, $namespace: String!) {
    service(name: $name, namespace: $namespace) {
      ...ServiceFragment
      pods { ...PodFragment }
      events { ...EventFragment }
    }
  }
  ${ServiceFragment}
  ${PodFragment}
  ${EventFragment}
`

export const DEPLOYMENT_Q = gql`
  query Deployment($name: String!, $namespace: String!) {
    deployment(name: $name, namespace: $namespace) {
      ...DeploymentFragment
      pods { ...PodFragment }
      events { ...EventFragment }
    }
  }
  ${DeploymentFragment}
  ${PodFragment}
  ${EventFragment}
`

export const INGRESS_Q = gql`
  query Ingress($name: String!, $namespace: String!) {
    ingress(name: $name, namespace: $namespace) {
      ...IngressFragment
      events { ...EventFragment }
    }
  }
  ${IngressFragment}
  ${EventFragment}
`

export const STATEFUL_SET_Q = gql`
  query StatefulSet($name: String!, $namespace: String!) {
    statefulSet(name: $name, namespace: $namespace) {
      ...StatefulSetFragment
      pods { ...PodFragment }
      events { ...EventFragment }
    }
  }
  ${StatefulSetFragment}
  ${PodFragment}
  ${EventFragment}
`

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
    nodes { ...NodeFragment }
    nodeMetrics { ...NodeMetricFragment }
  }
  ${NodeFragment}
  ${NodeMetricFragment}
`

export const NODE_Q = gql`
  query Node($name: String!) {
    node(name: $name) {
      ...NodeFragment
      raw
      pods { ...PodFragment }
      events { ...EventFragment }
    }
    nodeMetric(name: $name) { ...NodeMetricFragment }
  }
  ${NodeFragment}
  ${PodFragment}
  ${EventFragment}
  ${NodeMetricFragment}
`

export const NODE_EVENTS_Q = gql`
  query Node($name: String!) {
    node(name: $name) {
      events { ...EventFragment }
    }
  }
  ${EventFragment}
`

export const NODE_RAW_Q = gql`
  query Node($name: String!) {
    node(name: $name) {
      raw
    }
  }
`

export const NODE_METRICS_Q = gql`
  query Metrics($cpuRequests: String!, $cpuLimits: String!, $memRequests: String!, $memLimits: String!, $pods: String!, $offset: Int) {
    cpuRequests: metric(query: $cpuRequests, offset: $offset) { ...MetricResponseFragment }
    cpuLimits: metric(query: $cpuLimits, offset: $offset) { ...MetricResponseFragment }
    memRequests: metric(query: $memRequests, offset: $offset) { ...MetricResponseFragment }
    memLimits: metric(query: $memLimits, offset: $offset) { ...MetricResponseFragment }
    pods: metric(query: $pods, offset: $offset) { ...MetricResponseFragment }
  }
  ${MetricResponseFragment}
`

export const CLUSTER_SATURATION = gql`
  query Metrics($cpuUtilization: String!, $memUtilization: String!, $offset: Int) {
    cpuUtilization: metric(query: $cpuUtilization, offset: $offset) { ...MetricResponseFragment }
    memUtilization: metric(query: $memUtilization, offset: $offset) { ...MetricResponseFragment }
  }
  ${MetricResponseFragment}
`

export const CRON_JOB_Q = gql`
  query Cron($name: String!, $namespace: String!) {
    cronJob(name: $name, namespace: $namespace) {
      ...CronJobFragment
      events { ...EventFragment }
      jobs {
        metadata { name namespace }
        status { ...JobStatus }
      }
    }
  }
  ${CronJobFragment}
  ${EventFragment}
  ${JobStatus}
`

export const JOB_Q = gql`
  query Job($name: String!, $namespace: String!) {
    job(name: $name, namespace: $namespace) {
      ...JobFragment
      events { ...EventFragment }
    }
  }
  ${JobFragment}
  ${EventFragment}
`

export const CERTIFICATE_Q = gql`
  query Certificate($name: String!, $namespace: String!) {
    certificate(name: $name, namespace: $namespace) {
      ...CertificateFragment
      events { ...EventFragment }
    }
  }
  ${CertificateFragment}
  ${EventFragment}
`

export const POD_Q = gql`
  query Pod($name: String!, $namespace: String!) {
    pod(name: $name, namespace: $namespace) {
      ...PodFragment
      events { ...EventFragment }
    }
  }
  ${PodFragment}
  ${EventFragment}
`

export const USAGE_Q = gql`
  query Usage($cpu: String!, $mem: String!, $podCpu: String!, $podMem: String!, $step: String!, $offset: Int!) {
    cpu: metric(query: $cpu, offset: $offset, step: $step) { ...MetricResponseFragment }
    mem: metric(query: $mem, offset: $offset, step: $step) { ...MetricResponseFragment }
    podCpu: metric(query: $podCpu, offset: $offset, step: $step) { ...MetricResponseFragment }
    podMem: metric(query: $podMem, offset: $offset, step: $step) { ...MetricResponseFragment }
  }
  ${MetricResponseFragment}
`

export const SCALING_RECOMMENDATION = gql`
  query Scaling($name: String!, $namespace: String!, $kind: AutoscalingTarget!) {
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
