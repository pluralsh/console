import { ReactElement, useMemo } from 'react'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'
import {
  ChipList,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'

import {
  Common_EventList as EventListT,
  Common_Event as EventT,
  Pod_PodList as PodListT,
  Pod_Pod as PodT,
  ReplicaSetEventsQuery,
  ReplicaSetEventsQueryVariables,
  ReplicaSetPodsQuery,
  ReplicaSetPodsQueryVariables,
  ReplicaSetQueryVariables,
  ReplicaSetServicesQuery,
  ReplicaSetServicesQueryVariables,
  Replicaset_ReplicaSetDetail as ReplicaSetT,
  Service_ServiceList as ServiceListT,
  Service_Service as ServiceT,
  useReplicaSetEventsQuery,
  useReplicaSetPodsQuery,
  useReplicaSetQuery,
  useReplicaSetServicesQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import LoadingIndicator from '../../utils/LoadingIndicator'
import ResourceDetails, { TabEntry } from '../ResourceDetails'
import { MetadataSidecar, useKubernetesCluster } from '../utils'
import { SubTitle } from '../../cluster/nodes/SubTitle'
import HorizontalPodAutoscalers from '../common/HorizontalPodAutoscalers'
import { PodInfo } from '../common/PodInfo'
import { LabelSelector } from '../common/LabelSelector'
import { ResourceList } from '../ResourceList'
import { useEventsColumns } from '../cluster/Events'
import { useServicesColumns } from '../discovery/Services'
import {
  REPLICA_SETS_REL_PATH,
  getResourceDetailsAbsPath,
  getWorkloadsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { NAMESPACE_PARAM } from '../Kubernetes'

import { getBreadcrumbs } from './ReplicaSets'
import { usePodColumns } from './Pods'

const directory: Array<TabEntry> = [
  { path: 'pods', label: 'Pods' },
  { path: 'services', label: 'Services' },
  { path: 'hpas', label: 'Horizontal Pod Autoscalers' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
] as const

export default function ReplicaSet(): ReactElement {
  const cluster = useKubernetesCluster()
  const { clusterId, name, namespace } = useParams()
  const { data, loading } = useReplicaSetQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      name,
      namespace,
    } as ReplicaSetQueryVariables,
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
            'replicaset',
            name,
            namespace
          ),
        },
      ],
      [cluster, clusterId, name, namespace]
    )
  )

  const rs = data?.handleGetReplicaSetDetail as ReplicaSetT

  if (loading) {
    return <LoadingIndicator />
  }

  return (
    <ResourceDetails
      tabs={directory}
      sidecar={
        <MetadataSidecar resource={rs}>
          <SidecarItem heading="Selector">
            <LabelSelector selector={rs?.selector} />
          </SidecarItem>
          <SidecarItem heading="Images">
            <ChipList
              size="small"
              limit={3}
              values={(rs?.containerImages ?? []).concat(
                rs?.initContainerImages ?? []
              )}
              emptyState={<div>None</div>}
            />
          </SidecarItem>
          <SidecarItem heading="Status">
            <PodInfo info={rs?.podInfo} />
          </SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={rs} />
    </ResourceDetails>
  )
}

export function ReplicaSetInfo(): ReactElement {
  const rs = useOutletContext() as ReplicaSetT

  return (
    <section>
      <SubTitle>Horizontal Pod Autoscalers</SubTitle>
      <HorizontalPodAutoscalers
        hpas={rs?.horizontalPodAutoscalerList?.horizontalpodautoscalers ?? []}
      />
    </section>
  )
}

export function ReplicaSetEvents(): ReactElement {
  const { name, namespace } = useParams()
  const columns = useEventsColumns()

  return (
    <ResourceList<
      EventListT,
      EventT,
      ReplicaSetEventsQuery,
      ReplicaSetEventsQueryVariables
    >
      namespaced
      columns={columns}
      query={useReplicaSetEventsQuery}
      queryOptions={{
        variables: {
          namespace,
          name,
        } as ReplicaSetEventsQueryVariables,
      }}
      queryName="handleGetReplicaSetEvents"
      itemsKey="events"
      disableOnRowClick
    />
  )
}

export function ReplicaSetPods(): ReactElement {
  const { name, namespace } = useParams()
  const columns = usePodColumns()

  return (
    <ResourceList<
      PodListT,
      PodT,
      ReplicaSetPodsQuery,
      ReplicaSetPodsQueryVariables
    >
      namespaced
      columns={columns}
      query={useReplicaSetPodsQuery}
      queryOptions={{
        variables: {
          namespace,
          name,
        } as ReplicaSetPodsQueryVariables,
      }}
      queryName="handleGetReplicaSetPods"
      itemsKey="pods"
      disableOnRowClick
    />
  )
}

export function ReplicaSetServices(): ReactElement {
  const { name, namespace } = useParams()
  const columns = useServicesColumns()

  return (
    <ResourceList<
      ServiceListT,
      ServiceT,
      ReplicaSetServicesQuery,
      ReplicaSetServicesQueryVariables
    >
      namespaced
      columns={columns}
      query={useReplicaSetServicesQuery}
      queryOptions={{
        variables: {
          namespace,
          name,
        } as ReplicaSetServicesQueryVariables,
      }}
      queryName="handleGetReplicaSetServices"
      itemsKey="services"
      disableOnRowClick
    />
  )
}
