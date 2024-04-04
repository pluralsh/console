import { ReactElement, useMemo } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import {
  ChipList,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'

import {
  DeploymentQueryVariables,
  Common_EventList as EventListT,
  Common_Event as EventT,
  Pod_PodList as PodListT,
  Pod_Pod as PodT,
  ReplicationControllerEventsQuery,
  ReplicationControllerEventsQueryVariables,
  ReplicationControllerPodsQuery,
  ReplicationControllerPodsQueryVariables,
  ReplicationControllerServicesQuery,
  ReplicationControllerServicesQueryVariables,
  Replicationcontroller_ReplicationControllerDetail as ReplicationControllerT,
  Service_ServiceList as ServiceListT,
  Service_Service as ServiceT,
  useReplicationControllerEventsQuery,
  useReplicationControllerPodsQuery,
  useReplicationControllerQuery,
  useReplicationControllerServicesQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import { MetadataSidecar, useKubernetesCluster } from '../utils'
import ResourceDetails, { TabEntry } from '../ResourceDetails'
import {
  REPLICATION_CONTROLLERS_REL_PATH,
  getResourceDetailsAbsPath,
  getWorkloadsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { NAMESPACE_PARAM } from '../Kubernetes'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { PodInfo } from '../common/PodInfo'
import { ResourceList } from '../ResourceList'
import { useEventsColumns } from '../cluster/Events'
import { useServicesColumns } from '../discovery/Services'

import { getBreadcrumbs } from './ReplicationControllers'
import { usePodColumns } from './Pods'

const directory: Array<TabEntry> = [
  { path: 'pods', label: 'Pods' },
  { path: 'services', label: 'Services' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
] as const

export default function ReplicationController(): ReactElement {
  const cluster = useKubernetesCluster()
  const { clusterId, name, namespace } = useParams()
  const { data, loading } = useReplicationControllerQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      name,
      namespace,
    } as DeploymentQueryVariables,
  })

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),
        {
          label: namespace ?? '',
          url: `${getWorkloadsAbsPath(
            clusterId
          )}/${REPLICATION_CONTROLLERS_REL_PATH}?${NAMESPACE_PARAM}=${namespace}`,
        },
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(
            clusterId,
            'replicationcontroller',
            name,
            namespace
          ),
        },
      ],
      [cluster, clusterId, name, namespace]
    )
  )

  const statefulSet =
    data?.handleGetReplicationControllerDetail as ReplicationControllerT

  if (loading) {
    return <LoadingIndicator />
  }

  return (
    <ResourceDetails
      tabs={directory}
      sidecar={
        <MetadataSidecar resource={statefulSet}>
          <SidecarItem heading="Images">
            <ChipList
              size="small"
              limit={3}
              values={(statefulSet?.containerImages ?? []).concat(
                statefulSet?.initContainerImages ?? []
              )}
              emptyState={<div>None</div>}
              truncateWidth={300}
              tooltip
            />
          </SidecarItem>
          <SidecarItem heading="Status">
            <PodInfo info={statefulSet?.podInfo} />
          </SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={statefulSet} />
    </ResourceDetails>
  )
}

export function ReplicationControllerPods(): ReactElement {
  const { name, namespace } = useParams()
  const columns = usePodColumns()

  return (
    <ResourceList<
      PodListT,
      PodT,
      ReplicationControllerPodsQuery,
      ReplicationControllerPodsQueryVariables
    >
      namespaced
      columns={columns}
      query={useReplicationControllerPodsQuery}
      queryOptions={{
        variables: {
          namespace,
          name,
        } as ReplicationControllerPodsQueryVariables,
      }}
      queryName="handleGetReplicationControllerPods"
      itemsKey="pods"
    />
  )
}

export function ReplicationControllerServices(): ReactElement {
  const { name, namespace } = useParams()
  const columns = useServicesColumns()

  return (
    <ResourceList<
      ServiceListT,
      ServiceT,
      ReplicationControllerServicesQuery,
      ReplicationControllerServicesQueryVariables
    >
      namespaced
      columns={columns}
      query={useReplicationControllerServicesQuery}
      queryOptions={{
        variables: {
          namespace,
          name,
        } as ReplicationControllerServicesQueryVariables,
      }}
      queryName="handleGetReplicationControllerServices"
      itemsKey="services"
    />
  )
}

export function ReplicationControllerEvents(): ReactElement {
  const { name, namespace } = useParams()
  const columns = useEventsColumns()

  return (
    <ResourceList<
      EventListT,
      EventT,
      ReplicationControllerEventsQuery,
      ReplicationControllerEventsQueryVariables
    >
      namespaced
      columns={columns}
      query={useReplicationControllerEventsQuery}
      queryOptions={{
        variables: {
          namespace,
          name,
        } as ReplicationControllerEventsQueryVariables,
      }}
      queryName="handleGetReplicationControllerEvents"
      itemsKey="events"
      disableOnRowClick
    />
  )
}
