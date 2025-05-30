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
  Daemonset_DaemonSetDetail as DaemonSetT,
  DaemonSetEventsDocument,
  DaemonSetEventsQuery,
  DaemonSetEventsQueryVariables,
  DaemonSetPodsDocument,
  DaemonSetPodsQuery,
  DaemonSetPodsQueryVariables,
  DaemonSetQueryVariables,
  DaemonSetServicesDocument,
  DaemonSetServicesQuery,
  DaemonSetServicesQueryVariables,
  Pod_Pod as PodT,
  Pod_PodList as PodListT,
  Service_Service as ServiceT,
  Service_ServiceList as ServiceListT,
  useDaemonSetQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
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
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import { ResourceList } from '../common/ResourceList'

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
  const { clusterId, name, namespace } = useParams()
  const { data, loading } = useDaemonSetQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      name,
      namespace,
    } as DaemonSetQueryVariables,
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

  const daemonSet = data?.handleGetDaemonSetDetail as DaemonSetT

  if (loading) {
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
    <ResourceList<
      PodListT,
      PodT,
      DaemonSetPodsQuery,
      DaemonSetPodsQueryVariables
    >
      namespaced
      columns={columns}
      queryDocument={DaemonSetPodsDocument}
      queryOptions={{
        variables: { namespace, name } as DaemonSetPodsQueryVariables,
      }}
      queryName="handleGetDaemonSetPods"
      itemsKey="pods"
    />
  )
}

export function DaemonSetServices(): ReactElement<any> {
  const { name, namespace } = useParams()
  const columns = useServicesColumns()

  return (
    <ResourceList<
      ServiceListT,
      ServiceT,
      DaemonSetServicesQuery,
      DaemonSetServicesQueryVariables
    >
      namespaced
      columns={columns}
      queryDocument={DaemonSetServicesDocument}
      queryOptions={{
        variables: { namespace, name } as DaemonSetServicesQueryVariables,
      }}
      queryName="handleGetDaemonSetServices"
      itemsKey="services"
    />
  )
}

export function DaemonSetEvents(): ReactElement<any> {
  const { name, namespace } = useParams()
  const columns = useEventsColumns()

  return (
    <ResourceList<
      EventListT,
      EventT,
      DaemonSetEventsQuery,
      DaemonSetEventsQueryVariables
    >
      namespaced
      columns={columns}
      queryDocument={DaemonSetEventsDocument}
      queryOptions={{
        variables: { namespace, name } as DaemonSetEventsQueryVariables,
      }}
      queryName="handleGetDaemonSetEvents"
      itemsKey="events"
      disableOnRowClick
    />
  )
}
