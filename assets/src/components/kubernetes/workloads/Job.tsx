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
  JobEventsQuery,
  JobEventsQueryVariables,
  JobPodsQuery,
  JobPodsQueryVariables,
  JobQueryVariables,
  Job_JobDetail as JobT,
  Pod_PodList as PodListT,
  Pod_Pod as PodT,
  useJobEventsQuery,
  useJobPodsQuery,
  useJobQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import { MetadataSidecar } from '../common/utils'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import {
  JOBS_REL_PATH,
  getResourceDetailsAbsPath,
  getWorkloadsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { NAMESPACE_PARAM } from '../Navigation'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { ResourceList } from '../common/ResourceList'
import { useEventsColumns } from '../cluster/Events'
import Conditions from '../common/Conditions'
import { ReadinessT } from '../../../utils/status'
import { StatusChip } from '../../cluster/TableElements'
import { useCluster } from '../Cluster'

import { Kind } from '../common/types'

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
  const { jobStatus } = useOutletContext() as JobT

  return <Conditions conditions={jobStatus?.conditions} />
}

export function JobPods(): ReactElement<any> {
  const { name, namespace } = useParams()
  const columns = usePodsColumns()

  return (
    <ResourceList<PodListT, PodT, JobPodsQuery, JobPodsQueryVariables>
      namespaced
      columns={columns}
      query={useJobPodsQuery}
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
      query={useJobEventsQuery}
      queryOptions={{
        variables: { namespace, name } as JobEventsQueryVariables,
      }}
      queryName="handleGetJobEvents"
      itemsKey="events"
      disableOnRowClick
    />
  )
}
