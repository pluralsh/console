import { gql } from 'apollo-boost'
import { CronJobFragment, DeploymentFragment, EventFragment, IngressFragment, NodeFragment, PodFragment, ServiceFragment, StatefulSetFragment } from '../graphql/kubernetes';

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
      events { ...EventFragment }
    }
  }
  ${NodeFragment}
  ${PodFragment}
  ${EventFragment}
`

export const CRON_JOB_Q = gql`
  query Cron($name: String!, $namespace: String!) {
    cronJob(name: $name, namespace: $namespace) {
      ...CronJobFragment
      events { ...EventFragment }
    }
  }
  ${CronJobFragment}
  ${EventFragment}
`;

export const POD_Q = gql`
  query Pod($name: String!, $namespace: String!) {
    pod(name: $name, namespace: $namespace) {
      ...PodFragment
    }
  }
  ${PodFragment}
`;