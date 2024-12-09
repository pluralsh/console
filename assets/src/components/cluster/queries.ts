import { gql } from 'apollo-boost'

import { JobFragment, PodFragment } from 'components/graphql/kubernetes'

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
