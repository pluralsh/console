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
  Pod_Pod as PodT,
  Pod_PodList as PodListT,
  Replicaset_ReplicaSetDetail as ReplicaSetT,
  ReplicaSetEventsDocument,
  ReplicaSetEventsQuery,
  ReplicaSetEventsQueryVariables,
  ReplicaSetPodsDocument,
  ReplicaSetPodsQuery,
  ReplicaSetPodsQueryVariables,
  ReplicaSetQueryVariables,
  ReplicaSetServicesDocument,
  ReplicaSetServicesQuery,
  ReplicaSetServicesQueryVariables,
  Service_Service as ServiceT,
  Service_ServiceList as ServiceListT,
  useReplicaSetQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
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
import { ResourceList } from '../common/ResourceList'
import { Kind } from '../common/types'
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
      queryDocument={ReplicaSetEventsDocument}
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
      queryDocument={ReplicaSetPodsDocument}
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
      queryDocument={ReplicaSetServicesDocument}
      queryOptions={{
        variables: { namespace, name } as ReplicaSetServicesQueryVariables,
      }}
      queryName="handleGetReplicaSetServices"
      itemsKey="services"
    />
  )
}
