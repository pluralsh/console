import { gql } from 'apollo-boost'
import { MetricResponseFragment } from '../graphql/dashboards';
import { CertificateFragment, CronJobFragment, DeploymentFragment, EventFragment, IngressFragment, JobFragment, JobStatus, NodeFragment, PodFragment, ServiceFragment, StatefulSetFragment } from '../graphql/kubernetes';

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
`;

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
`;

export const INGRESS_Q = gql`
  query Ingress($name: String!, $namespace: String!) {
    ingress(name: $name, namespace: $namespace) {
      ...IngressFragment
      events { ...EventFragment }
    }
  }
  ${IngressFragment}
  ${EventFragment}
`;

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
`;

export const DELETE_POD = gql`
  mutation DeletePod($name: String!, $namespace: String!) {
    deletePod(name: $name, namespace: $namespace) {
      ...PodFragment
    }
  }
  ${PodFragment}
`;

export const NODES_Q = gql`
  query {
    nodes { ...NodeFragment }
  }
  ${NodeFragment}
`

export const NODE_Q = gql`
  query Node($name: String!) {
    node(name: $name) {
      ...NodeFragment
      pods { ...PodFragment }
      events { ...EventFragment }
    }
  }
  ${NodeFragment}
  ${PodFragment}
  ${EventFragment}
`

export const NODE_METRICS_Q = gql`
  query Metrics($cpuRequests: String!, $cpuLimits: String!, $memRequests: String!, $memLimits: String!, $offset: Int) {
    cpuRequests: metric(query: $cpuRequests, offset: $offset) { ...MetricResponseFragment }
    cpuLimits: metric(query: $cpuLimits, offset: $offset) { ...MetricResponseFragment }
    memRequests: metric(query: $memRequests, offset: $offset) { ...MetricResponseFragment }
    memLimits: metric(query: $memLimits, offset: $offset) { ...MetricResponseFragment }
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
`;

export const JOB_Q = gql`
  query Job($name: String!, $namespace: String!) {
    job(name: $name, namespace: $namespace) {
      ...JobFragment
      events { ...EventFragment }
    }
  }
  ${JobFragment}
  ${EventFragment}
`;

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
    }
  }
  ${PodFragment}
`;

export const USAGE_Q = gql`
  query Usage($cpu: String!, $mem: String!, $podCpu: String!, $podMem: String!, $step: String!, $offset: Int!) {
    cpu: metric(query: $cpu, offset: $offset, step: $step) { ...MetricResponseFragment }
    mem: metric(query: $mem, offset: $offset, step: $step) { ...MetricResponseFragment }
    podCpu: metric(query: $podCpu, offset: $offset, step: $step) { ...MetricResponseFragment }
    podMem: metric(query: $podMem, offset: $offset, step: $step) { ...MetricResponseFragment }
  }
  ${MetricResponseFragment}
`;