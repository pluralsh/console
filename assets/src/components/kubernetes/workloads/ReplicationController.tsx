import {
  ChipList,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ReactElement, useMemo } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AxiosInstance } from '../../../helpers/axios.ts'

import {
  CommonEvent,
  CommonEventList,
  PodPod,
  PodPodList,
  ServiceService,
  ServiceServiceList,
  V1LabelSelector as LabelSelectorT,
} from '../../../generated/kubernetes'
import {
  getReplicationControllerEventsInfiniteOptions,
  getReplicationControllerOptions,
  getReplicationControllerPodsInfiniteOptions,
  getReplicationControllerServicesInfiniteOptions,
} from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'
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
import { UpdatedResourceList } from '../common/UpdatedResourceList'

import { Kind } from '../common/types'
import { GqlError } from '../../utils/Alert'
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
  const { clusterId = '', name = '', namespace = '' } = useParams()
  const {
    data: rc,
    isFetching,
    error,
  } = useQuery({
    ...getReplicationControllerOptions({
      client: AxiosInstance(clusterId),
      path: { replicationController: name, namespace },
    }),
    refetchInterval: 30_000,
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

  if (error) {
    return <GqlError error={error} />
  }

  if (isFetching) {
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
  const { name = '', namespace = '' } = useParams()
  const columns = usePodsColumns()

  return (
    <UpdatedResourceList<PodPodList, PodPod>
      namespaced
      columns={columns}
      queryOptions={getReplicationControllerPodsInfiniteOptions}
      pathParams={{ replicationController: name, namespace }}
      itemsKey="pods"
    />
  )
}

export function ReplicationControllerServices(): ReactElement<any> {
  const { name = '', namespace = '' } = useParams()
  const columns = useServicesColumns()

  return (
    <UpdatedResourceList<ServiceServiceList, ServiceService>
      namespaced
      columns={columns}
      queryOptions={getReplicationControllerServicesInfiniteOptions}
      pathParams={{ replicationController: name, namespace }}
      itemsKey="services"
    />
  )
}

export function ReplicationControllerEvents(): ReactElement<any> {
  const { name = '', namespace = '' } = useParams()
  const columns = useEventsColumns()

  return (
    <UpdatedResourceList<CommonEventList, CommonEvent>
      namespaced
      columns={columns}
      queryOptions={getReplicationControllerEventsInfiniteOptions}
      pathParams={{ replicationController: name, namespace }}
      itemsKey="events"
      disableOnRowClick
    />
  )
}
