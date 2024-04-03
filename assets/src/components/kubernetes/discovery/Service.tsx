import { ReactElement, useMemo } from 'react'
import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'

import {
  Common_EventList as EventListT,
  Common_Event as EventT,
  Pod_PodList as PodListT,
  Pod_Pod as PodT,
  ServiceEventsQuery,
  ServiceEventsQueryVariables,
  ServicePodsQuery,
  ServicePodsQueryVariables,
  ServiceQueryVariables,
  Service_ServiceDetail as ServiceT,
  useServiceEventsQuery,
  useServicePodsQuery,
  useServiceQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { MetadataSidecar, useKubernetesCluster } from '../utils'
import { NAMESPACE_PARAM } from '../Kubernetes'
import {
  SERVICES_REL_PATH,
  getDiscoveryAbsPath,
  getResourceDetailsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import ResourceDetails, { TabEntry } from '../ResourceDetails'
import { usePodColumns } from '../workloads/Pods'
import { ResourceList } from '../ResourceList'
import { useEventsColumns } from '../cluster/Events'
import { SubTitle } from '../../cluster/nodes/SubTitle'

import { getBreadcrumbs } from './Services'

const directory: Array<TabEntry> = [
  { path: '', label: 'Info' },
  { path: 'pods', label: 'Pods' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
] as const

export default function Service(): ReactElement {
  const cluster = useKubernetesCluster()
  const { clusterId, name = '', namespace = '' } = useParams()
  const { data, loading } = useServiceQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      name,
      namespace,
    } as ServiceQueryVariables,
  })

  const service = data?.handleGetServiceDetail

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),
        {
          label: namespace ?? '',
          url: `${getDiscoveryAbsPath(
            cluster?.id
          )}/${SERVICES_REL_PATH}?${NAMESPACE_PARAM}=${namespace}`,
        },
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(clusterId, 'service', name, namespace),
        },
      ],
      [cluster, clusterId, name, namespace]
    )
  )

  if (loading) return <LoadingIndicator />

  return (
    <ResourceDetails
      tabs={directory}
      sidecar={<MetadataSidecar resource={service} />}
    >
      <Outlet context={service} />
    </ResourceDetails>
  )
}

export function ServiceInfo(): ReactElement {
  const _service = useOutletContext() as ServiceT

  return (
    <section>
      <SubTitle>TODO</SubTitle>
    </section>
  )
}

export function ServicePods(): ReactElement {
  const { name, namespace } = useParams()
  const columns = usePodColumns()

  return (
    <ResourceList<PodListT, PodT, ServicePodsQuery, ServicePodsQueryVariables>
      namespaced
      columns={columns}
      query={useServicePodsQuery}
      queryOptions={{
        variables: { namespace, name } as ServicePodsQueryVariables,
      }}
      queryName="handleGetServicePods"
      itemsKey="pods"
      disableOnRowClick
    />
  )
}

export function ServiceEvents(): ReactElement {
  const { name, namespace } = useParams()
  const columns = useEventsColumns()

  return (
    <ResourceList<
      EventListT,
      EventT,
      ServiceEventsQuery,
      ServiceEventsQueryVariables
    >
      namespaced
      columns={columns}
      query={useServiceEventsQuery}
      queryOptions={{
        variables: {
          namespace,
          name,
        } as ServiceEventsQueryVariables,
      }}
      queryName="handleGetServiceEvent"
      itemsKey="events"
      disableOnRowClick
    />
  )
}
