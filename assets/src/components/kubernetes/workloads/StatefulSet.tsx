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
} from '../../../generated/kubernetes'
import {
  getStatefulSetEventsInfiniteOptions,
  getStatefulSetOptions,
  getStatefulSetPodsInfiniteOptions,
} from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'
import {
  getResourceDetailsAbsPath,
  getWorkloadsAbsPath,
  STATEFUL_SETS_REL_PATH,
} from '../../../routes/kubernetesRoutesConsts'
import LoadingIndicator from '../../utils/LoadingIndicator'

import { useCluster } from '../Cluster'
import { useEventsColumns } from '../cluster/Events'
import { PodInfo } from '../common/PodInfo'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'

import { Kind } from '../common/types'
import { MetadataSidecar } from '../common/utils'
import { NAMESPACE_PARAM } from '../Navigation'
import { usePodsColumns } from './Pods'

import { getBreadcrumbs } from './StatefulSets'
import { WorkloadStatusChip } from './utils'
import { ResourceList } from '../common/ResourceList.tsx'

const directory: Array<TabEntry> = [
  { path: 'pods', label: 'Pods' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
] as const

export default function StatefulSet(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId = '', name = '', namespace = '' } = useParams()
  const { data: statefulSet, isFetching } = useQuery({
    ...getStatefulSetOptions({
      client: AxiosInstance(clusterId),
      path: { statefulset: name, namespace },
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
          )}/${STATEFUL_SETS_REL_PATH}?${NAMESPACE_PARAM}=${namespace}`,
        },
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(
            clusterId,
            Kind.StatefulSet,
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
        <MetadataSidecar resource={statefulSet}>
          <SidecarItem heading="Status">
            <WorkloadStatusChip podInfo={statefulSet?.podInfo} />
          </SidecarItem>
          <SidecarItem heading="Pods">
            <PodInfo info={statefulSet?.podInfo} />
          </SidecarItem>
          <SidecarItem heading="Images">
            <ChipList
              size="small"
              limit={3}
              values={(statefulSet?.containerImages ?? []).concat(
                statefulSet?.initContainerImages ?? []
              )}
              emptyState={<div>-</div>}
              truncateWidth={300}
              tooltip
            />
          </SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={statefulSet} />
    </ResourceDetails>
  )
}

export function StatefulSetPods(): ReactElement<any> {
  const { name, namespace } = useParams()
  const columns = usePodsColumns()

  return (
    <ResourceList<PodPodList, PodPod>
      namespaced
      columns={columns}
      queryOptions={getStatefulSetPodsInfiniteOptions}
      pathParams={{ statefulset: name, namespace }}
      itemsKey="pods"
    />
  )
}

export function StatefulSetEvents(): ReactElement<any> {
  const { name, namespace } = useParams()
  const columns = useEventsColumns()

  return (
    <ResourceList<CommonEventList, CommonEvent>
      namespaced
      columns={columns}
      queryOptions={getStatefulSetEventsInfiniteOptions}
      pathParams={{ statefulset: name, namespace }}
      itemsKey="events"
      disableOnRowClick
    />
  )
}
