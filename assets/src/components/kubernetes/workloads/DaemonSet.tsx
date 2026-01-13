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
} from '../../../generated/kubernetes'
import {
  getDaemonSetEventsInfiniteOptions,
  getDaemonSetOptions,
  getDaemonSetPodsInfiniteOptions,
  getDaemonSetServicesInfiniteOptions,
} from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'
import {
  DAEMON_SETS_REL_PATH,
  getResourceDetailsAbsPath,
  getWorkloadsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { useCluster } from '../Cluster'
import { useEventsColumns } from '../cluster/Events'
import { LabelSelector } from '../common/LabelSelector'
import { PodInfo } from '../common/PodInfo'
import { ResourceList } from '../common/ResourceList.tsx'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'

import { Kind } from '../common/types'
import { MetadataSidecar } from '../common/utils'
import { NAMESPACE_PARAM } from '../Navigation'
import { useServicesColumns } from '../network/Services'

import { getBreadcrumbs } from './DaemonSets'
import { usePodsColumns } from './Pods'
import { WorkloadStatusChip } from './utils'

const directory: Array<TabEntry> = [
  { path: 'pods', label: 'Pods' },
  { path: 'services', label: 'Services' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
] as const

export default function DaemonSet(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId = '', name = '', namespace = '' } = useParams()
  const { data: daemonSet, isFetching } = useQuery({
    ...getDaemonSetOptions({
      client: AxiosInstance(clusterId),
      path: { daemonSet: name, namespace },
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
          )}/${DAEMON_SETS_REL_PATH}?${NAMESPACE_PARAM}=${namespace}`,
        },
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(
            clusterId,
            Kind.DaemonSet,
            name,
            namespace
          ),
        },
      ],
      [cluster, clusterId, name, namespace]
    )
  )

  if (isFetching) {
    return <LoadingIndicator />
  }

  return (
    <ResourceDetails
      tabs={directory}
      sidecar={
        <MetadataSidecar resource={daemonSet}>
          <SidecarItem heading="Status">
            <WorkloadStatusChip podInfo={daemonSet?.podInfo} />
          </SidecarItem>
          <SidecarItem heading="Pods">
            <PodInfo info={daemonSet?.podInfo} />
          </SidecarItem>
          <SidecarItem heading="Images">
            <ChipList
              size="small"
              limit={3}
              values={daemonSet?.containerImages ?? []}
              emptyState={<div>-</div>}
            />
          </SidecarItem>
          <SidecarItem heading="Selector">
            <LabelSelector selector={daemonSet?.labelSelector} />
          </SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={daemonSet} />
    </ResourceDetails>
  )
}

export function DaemonSetPods(): ReactElement<any> {
  const { name, namespace } = useParams()
  const columns = usePodsColumns()

  return (
    <ResourceList<PodPodList, PodPod>
      namespaced
      columns={columns}
      queryOptions={getDaemonSetPodsInfiniteOptions}
      pathParams={{ daemonSet: name, namespace }}
      itemsKey="pods"
    />
  )
}

export function DaemonSetServices(): ReactElement<any> {
  const { name, namespace } = useParams()
  const columns = useServicesColumns()

  return (
    <ResourceList<ServiceServiceList, ServiceService>
      namespaced
      columns={columns}
      queryOptions={getDaemonSetServicesInfiniteOptions}
      pathParams={{ daemonSet: name, namespace }}
      itemsKey="services"
    />
  )
}

export function DaemonSetEvents(): ReactElement<any> {
  const { name, namespace } = useParams()
  const columns = useEventsColumns()

  return (
    <ResourceList<CommonEventList, CommonEvent>
      namespaced
      columns={columns}
      queryOptions={getDaemonSetEventsInfiniteOptions}
      pathParams={{ daemonSet: name, namespace }}
      itemsKey="events"
      disableOnRowClick
    />
  )
}
