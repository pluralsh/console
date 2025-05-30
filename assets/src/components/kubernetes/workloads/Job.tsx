import {
  ChipList,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ReactElement, useMemo } from 'react'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'

import {
  Common_Event as EventT,
  Common_EventList as EventListT,
  Job_JobDetail as JobT,
  JobEventsDocument,
  JobEventsQuery,
  JobEventsQueryVariables,
  JobPodsDocument,
  JobPodsQuery,
  JobPodsQueryVariables,
  JobQueryVariables,
  Pod_Pod as PodT,
  Pod_PodList as PodListT,
  useJobQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import {
  getResourceDetailsAbsPath,
  getWorkloadsAbsPath,
  JOBS_REL_PATH,
} from '../../../routes/kubernetesRoutesConsts'
import { ReadinessT } from '../../../utils/status'
import { StatusChip } from '../../cluster/TableElements'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { useCluster } from '../Cluster'
import { useEventsColumns } from '../cluster/Events'
import Conditions from '../common/Conditions'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import { ResourceList } from '../common/ResourceList'

import { Kind } from '../common/types'
import { MetadataSidecar } from '../common/utils'
import { NAMESPACE_PARAM } from '../Navigation'

import { getBreadcrumbs } from './Jobs'
import { usePodsColumns } from './Pods'

const directory: Array<TabEntry> = [
  { path: 'conditions', label: 'Conditions' },
  { path: 'pods', label: 'Pods' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
] as const

export default function Job(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId, name, namespace } = useParams()
  const { data, loading } = useJobQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      name,
      namespace,
    } as JobQueryVariables,
  })

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),
        {
          label: namespace ?? '',
          url: `${getWorkloadsAbsPath(
            clusterId
          )}/${JOBS_REL_PATH}?${NAMESPACE_PARAM}=${namespace}`,
        },
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(clusterId, Kind.Job, name, namespace),
        },
      ],
      [cluster, clusterId, name, namespace]
    )
  )

  const job = data?.handleGetJobDetail as JobT

  if (loading) {
    return <LoadingIndicator />
  }

  return (
    <ResourceDetails
      tabs={directory}
      sidecar={
        <MetadataSidecar resource={job}>
          <SidecarItem heading="Status">
            <StatusChip
              readiness={job?.jobStatus?.status as ReadinessT}
              size="small"
            />
          </SidecarItem>
          <SidecarItem heading="Images">
            <ChipList
              size="small"
              limit={3}
              values={(job?.containerImages ?? []).concat(
                job?.initContainerImages ?? []
              )}
              emptyState={<div>-</div>}
            />
          </SidecarItem>
          <SidecarItem heading="Completions">{job?.completions}</SidecarItem>
          <SidecarItem heading="Parallelism">{job?.parallelism}</SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={job} />
    </ResourceDetails>
  )
}

export function JobConditions(): ReactElement<any> {
  const ctx = useOutletContext<JobT>()

  return <Conditions conditions={ctx?.jobStatus?.conditions} />
}

export function JobPods(): ReactElement<any> {
  const { name, namespace } = useParams()
  const columns = usePodsColumns()

  return (
    <ResourceList<PodListT, PodT, JobPodsQuery, JobPodsQueryVariables>
      namespaced
      columns={columns}
      queryDocument={JobPodsDocument}
      queryOptions={{
        variables: { namespace, name } as JobPodsQueryVariables,
      }}
      queryName="handleGetJobPods"
      itemsKey="pods"
    />
  )
}

export function JobEvents(): ReactElement<any> {
  const { name, namespace } = useParams()
  const columns = useEventsColumns()

  return (
    <ResourceList<EventListT, EventT, JobEventsQuery, JobEventsQueryVariables>
      namespaced
      columns={columns}
      queryDocument={JobEventsDocument}
      queryOptions={{
        variables: { namespace, name } as JobEventsQueryVariables,
      }}
      queryName="handleGetJobEvents"
      itemsKey="events"
      disableOnRowClick
    />
  )
}
