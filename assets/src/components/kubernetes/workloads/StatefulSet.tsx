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
  StatefulSetEventsQuery,
  StatefulSetEventsQueryVariables,
  StatefulSetPodsQuery,
  StatefulSetPodsQueryVariables,
  Statefulset_StatefulSetDetail as StatefulSetT,
  useStatefulSetEventsQuery,
  useStatefulSetPodsQuery,
  useStatefulSetQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import { MetadataSidecar, useKubernetesCluster } from '../utils'
import ResourceDetails, { TabEntry } from '../ResourceDetails'
import {
  STATEFUL_SETS_REL_PATH,
  getResourceDetailsAbsPath,
  getWorkloadsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { NAMESPACE_PARAM } from '../Kubernetes'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { useEventsColumns } from '../cluster/Events'
import { ResourceList } from '../ResourceList'
import { PodInfo } from '../common/PodInfo'

import { getBreadcrumbs } from './StatefulSets'
import { usePodColumns } from './Pods'

const directory: Array<TabEntry> = [
  { path: 'pods', label: 'Pods' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
] as const

export default function StatefulSet(): ReactElement {
  const cluster = useKubernetesCluster()
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
            'statefulset',
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

export function StatefulSetPods(): ReactElement {
  const { name, namespace } = useParams()
  const columns = usePodColumns()

  return (
    <ResourceList<
      PodListT,
      PodT,
      StatefulSetPodsQuery,
      StatefulSetPodsQueryVariables
    >
      namespaced
      columns={columns}
      query={useStatefulSetPodsQuery}
      queryOptions={{
        variables: {
          namespace,
          name,
        } as StatefulSetPodsQueryVariables,
      }}
      queryName="handleGetStatefulSetPods"
      itemsKey="pods"
    />
  )
}

export function StatefulSetEvents(): ReactElement {
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
      query={useStatefulSetEventsQuery}
      queryOptions={{
        variables: {
          namespace,
          name,
        } as StatefulSetEventsQueryVariables,
      }}
      queryName="handleGetStatefulSetEvents"
      itemsKey="events"
      disableOnRowClick
    />
  )
}
