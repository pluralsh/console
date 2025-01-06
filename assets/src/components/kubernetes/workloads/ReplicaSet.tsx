import { ReactElement, useMemo } from 'react'
import { Outlet, useParams } from 'react-router-dom'
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
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import { MetadataSidecar } from '../common/utils'
import { SubTitle } from '../../utils/SubTitle'
import HorizontalPodAutoscalersForResource from '../common/HorizontalPodAutoscalers'
import { PodInfo } from '../common/PodInfo'
import { LabelSelector } from '../common/LabelSelector'
import { ResourceList } from '../common/ResourceList'
import { useEventsColumns } from '../cluster/Events'
import { useServicesColumns } from '../network/Services'
import {
  REPLICA_SETS_REL_PATH,
  getResourceDetailsAbsPath,
  getWorkloadsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { NAMESPACE_PARAM } from '../Navigation'
import { useCluster } from '../Cluster'
import { Kind } from '../common/types'

import { getBreadcrumbs } from './ReplicaSets'
import { usePodsColumns } from './Pods'
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
            Kind.ReplicaSet,
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

export function ReplicaSetPods(): ReactElement<any> {
  const { name, namespace } = useParams()
  const columns = usePodsColumns()

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
        variables: { namespace, name } as ReplicaSetPodsQueryVariables,
      }}
      queryName="handleGetReplicaSetPods"
      itemsKey="pods"
    />
  )
}

export function ReplicaSetServices(): ReactElement<any> {
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
        variables: { namespace, name } as ReplicaSetServicesQueryVariables,
      }}
      queryName="handleGetReplicaSetServices"
      itemsKey="services"
    />
  )
}
