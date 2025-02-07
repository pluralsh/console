import { WatchQueryFetchPolicy } from '@apollo/client'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import {
  useCertificateQuery,
  useCronJobQuery,
  useDeploymentQuery,
  useIngressQuery,
  useJobQuery,
  useServiceQuery,
  useStatefulSetQuery,
  useDaemonSetQuery,
  useCanaryQuery,
  usePluralServiceDeploymentQuery,
  ServiceDeploymentComponentFragment,
  ServiceDeploymentDetailsFragment,
  useArgoRolloutQuery,
  useUnstructuredResourceQuery,
  ArgoRolloutFragment,
  CanaryFragment,
  CertificateFragment,
  CronJobFragment,
  DaemonSetFragment,
  DeploymentFragment,
  IngressFragment,
  JobFragment,
  PluralServiceDeploymentFragment,
  ServiceFragment,
  StatefulSetFragment,
  UnstructuredResourceFragment,
  PodFragment,
} from 'generated/graphql'

export type StructuredComponentKind =
  (typeof STRUCTURED_COMPONENT_KINDS)[number]

export type ComponentDetailsT =
  | CertificateFragment
  | CronJobFragment
  | DeploymentFragment
  | IngressFragment
  | JobFragment
  | ServiceFragment
  | StatefulSetFragment
  | DaemonSetFragment
  | CanaryFragment
  | PluralServiceDeploymentFragment
  | ArgoRolloutFragment
  | UnstructuredResourceFragment

export type ComponentDetailsWithPodsT = ComponentDetailsT & {
  pods: Nullable<Nullable<PodFragment>[]>
}

export function useFetchComponentDetails({
  component,
  service,
}: {
  component: ServiceDeploymentComponentFragment
  service?: Nullable<ServiceDeploymentDetailsFragment>
}) {
  const kindLower = component.kind?.toLowerCase()

  // call all hooks unconditionally, skip the ones that don't match
  const certificateQuery = useCertificateQuery(
    getQueryOptions({ component, service, queryKind: 'certificate' })
  )
  const cronJobQuery = useCronJobQuery(
    getQueryOptions({ component, service, queryKind: 'cronjob' })
  )
  const deploymentQuery = useDeploymentQuery(
    getQueryOptions({ component, service, queryKind: 'deployment' })
  )
  const ingressQuery = useIngressQuery(
    getQueryOptions({ component, service, queryKind: 'ingress' })
  )
  const jobQuery = useJobQuery(
    getQueryOptions({ component, service, queryKind: 'job' })
  )
  const serviceQueryResult = useServiceQuery(
    getQueryOptions({ component, service, queryKind: 'service' })
  )
  const statefulSetQuery = useStatefulSetQuery(
    getQueryOptions({ component, service, queryKind: 'statefulset' })
  )
  const daemonSetQuery = useDaemonSetQuery(
    getQueryOptions({ component, service, queryKind: 'daemonset' })
  )
  const canaryQuery = useCanaryQuery(
    getQueryOptions({ component, service, queryKind: 'canary' })
  )
  const pluralServiceDeploymentQuery = usePluralServiceDeploymentQuery(
    getQueryOptions({ component, service, queryKind: 'servicedeployment' })
  )
  const rolloutQuery = useArgoRolloutQuery(
    getQueryOptions({ component, service, queryKind: 'rollout' })
  )
  const unstructuredQuery = useUnstructuredResourceQuery({
    skip: !isUnstructured(kindLower),
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
    variables: {
      group: component.group,
      kind: component.kind,
      name: component.name,
      namespace: component.namespace,
      serviceId: service?.id ?? '',
      version: component.version ?? '',
    },
  })

  switch (kindLower) {
    case 'certificate':
      return certificateQuery
    case 'cronjob':
      return cronJobQuery
    case 'deployment':
      return deploymentQuery
    case 'ingress':
      return ingressQuery
    case 'job':
      return jobQuery
    case 'service':
      return serviceQueryResult
    case 'statefulset':
      return statefulSetQuery
    case 'daemonset':
      return daemonSetQuery
    case 'canary':
      return canaryQuery
    case 'servicedeployment':
      return pluralServiceDeploymentQuery
    case 'rollout':
      return rolloutQuery
    default:
      return unstructuredQuery
  }
}

const getQueryOptions = ({
  component,
  service,
  queryKind,
}: {
  component: ServiceDeploymentComponentFragment
  service: Nullable<ServiceDeploymentDetailsFragment>
  queryKind?: string
}) => {
  const kind = component.kind?.toLowerCase() ?? ''
  return {
    skip: kind !== queryKind,
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network' as WatchQueryFetchPolicy,
    variables: {
      name: component.name,
      namespace: component.namespace ?? '',
      serviceId: service?.id ?? '',
    },
  }
}

export function isUnstructured(kind: string): boolean {
  return !STRUCTURED_COMPONENT_KINDS.includes(
    kind.toLowerCase() as StructuredComponentKind
  )
}

const STRUCTURED_COMPONENT_KINDS = [
  'certificate',
  'cronjob',
  'deployment',
  'ingress',
  'job',
  'service',
  'statefulset',
  'daemonset',
  'canary',
  'servicedeployment',
  'rollout',
] as const
