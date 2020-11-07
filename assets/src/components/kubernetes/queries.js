import { gql } from 'apollo-boost'
import { CronJobFragment, DeploymentFragment, IngressFragment, NodeFragment, PodFragment, ResultStatus, ServiceFragment, StatefulSetFragment } from '../graphql/kubernetes';

export const SERVICE_Q = gql`
  query Service($name: String!, $namespace: String!) {
    service(name: $name, namespace: $namespace) {
      ...ServiceFragment
      pods { ...PodFragment }
    }
  }
  ${ServiceFragment}
  ${PodFragment}
`;

export const DEPLOYMENT_Q = gql`
  query Deployment($name: String!, $namespace: String!) {
    deployment(name: $name, namespace: $namespace) {
      ...DeploymentFragment
      pods { ...PodFragment }
    }
  }
  ${DeploymentFragment}
  ${PodFragment}
`;

export const INGRESS_Q = gql`
  query Ingress($name: String!, $namespace: String!) {
    ingress(name: $name, namespace: $namespace) { ...IngressFragment }
  }
  ${IngressFragment}
`;

export const STATEFUL_SET_Q = gql`
  query StatefulSet($name: String!, $namespace: String!) {
    statefulSet(name: $name, namespace: $namespace) {
      ...StatefulSetFragment
      pods { ...PodFragment }
    }
  }
  ${StatefulSetFragment}
  ${PodFragment}
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
    nodes {
      ...NodeFragment
    }
  }
  ${NodeFragment}
`

export const NODE_Q = gql`
  query Node($name: String!) {
    node(name: $name) {
      ...NodeFragment
      pods { ...PodFragment }
    }
  }
  ${NodeFragment}
  ${PodFragment}
`

export const CRON_JOB_Q = gql`
  query Cron($name: String!, $namespace: String!) {
    cronJob(name: $name, namespace: $namespace) {
      ...CronJobFragment
    }
  }
  ${CronJobFragment}
`;