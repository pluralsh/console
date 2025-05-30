import {
  ChipList,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ReactElement, useMemo } from 'react'
import { Outlet, useParams } from 'react-router-dom'

import {
  Common_Event as EventT,
  Common_EventList as EventListT,
  DeploymentQueryVariables,
  Pod_Pod as PodT,
  Pod_PodList as PodListT,
  Replicationcontroller_ReplicationControllerDetail as ReplicationControllerT,
  ReplicationControllerEventsDocument,
  ReplicationControllerEventsQuery,
  ReplicationControllerEventsQueryVariables,
  ReplicationControllerPodsDocument,
  ReplicationControllerPodsQuery,
  ReplicationControllerPodsQueryVariables,
  ReplicationControllerServicesDocument,
  ReplicationControllerServicesQuery,
  ReplicationControllerServicesQueryVariables,
  Service_Service as ServiceT,
  Service_ServiceList as ServiceListT,
  useReplicationControllerQuery,
  V1_LabelSelector as LabelSelectorT,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import {
  getResourceDetailsAbsPath,
  getWorkloadsAbsPath,
  REPLICATION_CONTROLLERS_REL_PATH,
} from '../../../routes/kubernetesRoutesConsts'
import LoadingIndicator from '../../utils/LoadingIndicator'

import { useCluster } from '../Cluster'
import { useEventsColumns } from '../cluster/Events'
import { LabelSelector } from '../common/LabelSelector'
import { PodInfo } from '../common/PodInfo'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import { ResourceList } from '../common/ResourceList'

import { Kind } from '../common/types'
import { MetadataSidecar } from '../common/utils'
import { NAMESPACE_PARAM } from '../Navigation'
import { useServicesColumns } from '../network/Services'
import { usePodsColumns } from './Pods'

import { getBreadcrumbs } from './ReplicationControllers'
import { WorkloadStatusChip } from './utils'

const directory: Array<TabEntry> = [
  { path: 'pods', label: 'Pods' },
  { path: 'services', label: 'Services' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
] as const

export default function ReplicationController(): ReactElement<any> {
  const cluster = useCluster()
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
            Kind.ReplicationController,
            name,
            namespace
          ),
        },
      ],
      [cluster, clusterId, name, namespace]
    )
  )

  const rc =
    data?.handleGetReplicationControllerDetail as ReplicationControllerT

  if (loading) {
    return <LoadingIndicator />
  }

  return (
    <ResourceDetails
      tabs={directory}
      sidecar={
        <MetadataSidecar resource={rc}>
          <SidecarItem heading="Status">
            <WorkloadStatusChip podInfo={rc?.podInfo} />
          </SidecarItem>
          <SidecarItem heading="Pods">
            <PodInfo info={rc?.podInfo} />
          </SidecarItem>
          <SidecarItem heading="Images">
            <ChipList
              size="small"
              limit={3}
              values={(rc?.containerImages ?? []).concat(
                rc?.initContainerImages ?? []
              )}
              emptyState={<div>-</div>}
              truncateWidth={300}
              tooltip
            />
          </SidecarItem>
          <SidecarItem heading="Selector">
            <LabelSelector
              selector={{ matchLabels: rc?.labelSelector } as LabelSelectorT}
            />
          </SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={rc} />
    </ResourceDetails>
  )
}

export function ReplicationControllerPods(): ReactElement<any> {
  const { name, namespace } = useParams()
  const columns = usePodsColumns()

  return (
    <ResourceList<
      PodListT,
      PodT,
      ReplicationControllerPodsQuery,
      ReplicationControllerPodsQueryVariables
    >
      namespaced
      columns={columns}
      queryDocument={ReplicationControllerPodsDocument}
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

export function ReplicationControllerServices(): ReactElement<any> {
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
      queryDocument={ReplicationControllerServicesDocument}
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

export function ReplicationControllerEvents(): ReactElement<any> {
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
      queryDocument={ReplicationControllerEventsDocument}
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
