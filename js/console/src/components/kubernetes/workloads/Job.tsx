import {
  ChipList,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ReactElement, useMemo } from 'react'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import {
  getJobEventsInfiniteOptions,
  getJobOptions,
  getJobPodsInfiniteOptions,
} from '../../../generated/kubernetes/@tanstack/react-query.gen'
import { JobJobDetail } from '../../../generated/kubernetes/types.gen'

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
import { AxiosInstance } from 'helpers/axios'
import { GqlError } from 'components/utils/Alert'

const directory: Array<TabEntry> = [
  { path: 'pods', label: 'Pods' },
  { path: 'conditions', label: 'Conditions' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
] as const

export default function Job(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId = '', name = '', namespace = '' } = useParams()

  const {
    data: job,
    error,
    isLoading,
  } = useQuery({
    ...getJobOptions({
      client: AxiosInstance(clusterId),
      path: { name, namespace },
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

  if (error) {
    return <GqlError error={error} />
  }

  if (isLoading) {
    return <LoadingIndicator />
  }

  return (
    <ResourceDetails
      tabs={directory}
      sidecar={
        <MetadataSidecar resource={job as JobJobDetail}>
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
  const ctx = useOutletContext<JobJobDetail>()

  return <Conditions conditions={ctx?.jobStatus?.conditions} />
}

export function JobPods(): ReactElement<any> {
  const { name, namespace } = useParams()
  const columns = usePodsColumns()

  return (
    <ResourceList
      columns={columns}
      queryOptions={getJobPodsInfiniteOptions}
      pathParams={{ name, namespace }}
      itemsKey="pods"
    />
  )
}

export function JobEvents(): ReactElement<any> {
  const { name, namespace } = useParams()
  const columns = useEventsColumns()

  return (
    <ResourceList
      columns={columns}
      queryOptions={getJobEventsInfiniteOptions}
      pathParams={{ name, namespace }}
      itemsKey="events"
      disableOnRowClick
    />
  )
}
