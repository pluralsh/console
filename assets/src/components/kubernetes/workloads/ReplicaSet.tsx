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
  getReplicaSetEventsInfiniteOptions,
  getReplicaSetOptions,
  getReplicaSetPodsInfiniteOptions,
  getReplicaSetServicesInfiniteOptions,
} from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'
import {
  getResourceDetailsAbsPath,
  getWorkloadsAbsPath,
  REPLICA_SETS_REL_PATH,
} from '../../../routes/kubernetesRoutesConsts'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { SubTitle } from '../../utils/SubTitle'
import { useCluster } from '../Cluster'
import { useEventsColumns } from '../cluster/Events'
import HorizontalPodAutoscalersForResource from '../common/HorizontalPodAutoscalers'
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

import { getBreadcrumbs } from './ReplicaSets'
import { WorkloadStatusChip } from './utils'

const directory: Array<TabEntry> = [
  { path: 'pods', label: 'Pods' },
  { path: 'services', label: 'Services' },
  { path: 'hpas', label: 'Horizontal Pod Autoscalers' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
] as const

export default function ReplicaSet(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId = '', name = '', namespace = '' } = useParams()
  const {
    data: rs,
    isFetching,
    error,
  } = useQuery({
    ...getReplicaSetOptions({
      client: AxiosInstance(clusterId),
      path: { replicaSet: name, namespace },
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
          )}/${REPLICA_SETS_REL_PATH}?${NAMESPACE_PARAM}=${namespace}`,
        },
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(
            clusterId,
            Kind.ReplicaSet,
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
        <MetadataSidecar resource={rs}>
          <SidecarItem heading="Status">
            <WorkloadStatusChip podInfo={rs?.podInfo} />
          </SidecarItem>
          <SidecarItem heading="Pods">
            <PodInfo info={rs?.podInfo} />
          </SidecarItem>
          <SidecarItem heading="Images">
            <ChipList
              size="small"
              limit={3}
              values={(rs?.containerImages ?? []).concat(
                rs?.initContainerImages ?? []
              )}
              emptyState={<div>-</div>}
            />
          </SidecarItem>
          <SidecarItem heading="Selector">
            <LabelSelector selector={rs?.selector} />
          </SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={rs} />
    </ResourceDetails>
  )
}

export function ReplicaSetInfo(): ReactElement<any> {
  const { name, namespace } = useParams()

  return (
    <section>
      <SubTitle>Horizontal Pod Autoscalers</SubTitle>
      <HorizontalPodAutoscalersForResource
        kind={Kind.ReplicaSet}
        namespace={namespace!}
        name={name!}
      />
    </section>
  )
}

export function ReplicaSetEvents(): ReactElement<any> {
  const { name = '', namespace = '' } = useParams()
  const columns = useEventsColumns()

  return (
    <UpdatedResourceList<CommonEventList, CommonEvent>
      namespaced
      columns={columns}
      queryOptions={getReplicaSetEventsInfiniteOptions}
      pathParams={{ replicaSet: name, namespace }}
      itemsKey="events"
      disableOnRowClick
    />
  )
}

export function ReplicaSetPods(): ReactElement<any> {
  const { name = '', namespace = '' } = useParams()
  const columns = usePodsColumns()

  return (
    <UpdatedResourceList<PodPodList, PodPod>
      namespaced
      columns={columns}
      queryOptions={getReplicaSetPodsInfiniteOptions}
      pathParams={{ replicaSet: name, namespace }}
      itemsKey="pods"
    />
  )
}

export function ReplicaSetServices(): ReactElement<any> {
  const { name = '', namespace = '' } = useParams()
  const columns = useServicesColumns()

  return (
    <UpdatedResourceList<ServiceServiceList, ServiceService>
      namespaced
      columns={columns}
      queryOptions={getReplicaSetServicesInfiniteOptions}
      pathParams={{ replicaSet: name, namespace }}
      itemsKey="services"
    />
  )
}
