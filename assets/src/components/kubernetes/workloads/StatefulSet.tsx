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
  Statefulset_StatefulSetDetail as StatefulSetT,
  StatefulSetEventsDocument,
  StatefulSetEventsQuery,
  StatefulSetEventsQueryVariables,
  StatefulSetPodsDocument,
  StatefulSetPodsQuery,
  StatefulSetPodsQueryVariables,
  useStatefulSetQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
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
import { ResourceList } from '../common/ResourceList'

import { Kind } from '../common/types'
import { MetadataSidecar } from '../common/utils'
import { NAMESPACE_PARAM } from '../Navigation'
import { usePodsColumns } from './Pods'

import { getBreadcrumbs } from './StatefulSets'
import { WorkloadStatusChip } from './utils'

const directory: Array<TabEntry> = [
  { path: 'pods', label: 'Pods' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
] as const

export default function StatefulSet(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId, name, namespace } = useParams()
  const { data, loading } = useStatefulSetQuery({
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

  const statefulSet = data?.handleGetStatefulSetDetail as StatefulSetT

  if (loading) {
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
    <ResourceList<
      PodListT,
      PodT,
      StatefulSetPodsQuery,
      StatefulSetPodsQueryVariables
    >
      namespaced
      columns={columns}
      queryDocument={StatefulSetPodsDocument}
      queryOptions={{
        variables: { namespace, name } as StatefulSetPodsQueryVariables,
      }}
      queryName="handleGetStatefulSetPods"
      itemsKey="pods"
    />
  )
}

export function StatefulSetEvents(): ReactElement<any> {
  const { name, namespace } = useParams()
  const columns = useEventsColumns()

  return (
    <ResourceList<
      EventListT,
      EventT,
      StatefulSetEventsQuery,
      StatefulSetEventsQueryVariables
    >
      namespaced
      columns={columns}
      queryDocument={StatefulSetEventsDocument}
      queryOptions={{
        variables: { namespace, name } as StatefulSetEventsQueryVariables,
      }}
      queryName="handleGetStatefulSetEvents"
      itemsKey="events"
      disableOnRowClick
    />
  )
}
