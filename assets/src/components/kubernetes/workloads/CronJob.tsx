import { ReactElement, useMemo } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import {
  ChipList,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import moment from 'moment/moment'

import {
  CronJobEventsQuery,
  CronJobEventsQueryVariables,
  CronJobJobsQuery,
  CronJobJobsQueryVariables,
  CronJobQueryVariables,
  Cronjob_CronJobDetail as CronJobT,
  Common_EventList as EventListT,
  Common_Event as EventT,
  Job_JobList as JobListT,
  Job_Job as JobT,
  useCronJobEventsQuery,
  useCronJobJobsQuery,
  useCronJobQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import { MetadataSidecar } from '../common/utils'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import {
  CRON_JOBS_REL_PATH,
  getResourceDetailsAbsPath,
  getWorkloadsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { NAMESPACE_PARAM } from '../ResourceList'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { ResourceList } from '../common/ResourceList'
import { useEventsColumns } from '../cluster/Events'

import { SubTitle } from '../../utils/SubTitle'

import { useClusterContext } from '../Cluster'

import { getBreadcrumbs } from './CronJobs'
import { useJobsColumns } from './Jobs'

const directory: Array<TabEntry> = [
  { path: 'jobs', label: 'Jobs' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
] as const

export default function CronJob(): ReactElement {
  const { cluster } = useClusterContext()
  const { clusterId, name, namespace } = useParams()
  const { data, loading } = useCronJobQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      name,
      namespace,
    } as CronJobQueryVariables,
  })

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),
        {
          label: namespace ?? '',
          url: `${getWorkloadsAbsPath(
            clusterId
          )}/${CRON_JOBS_REL_PATH}?${NAMESPACE_PARAM}=${namespace}`,
        },
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(clusterId, 'cronjob', name, namespace),
        },
      ],
      [cluster, clusterId, name, namespace]
    )
  )

  const cronJob = data?.handleGetCronJobDetail as CronJobT

  if (loading) {
    return <LoadingIndicator />
  }

  return (
    <ResourceDetails
      tabs={directory}
      sidecar={
        <MetadataSidecar resource={cronJob}>
          <SidecarItem heading="Images">
            <ChipList
              size="small"
              limit={3}
              values={cronJob?.containerImages ?? []}
              emptyState={<div>None</div>}
            />
          </SidecarItem>
          <SidecarItem heading="Schedule">{cronJob?.schedule}</SidecarItem>
          <SidecarItem heading="Last schedule">
            {moment(cronJob?.lastSchedule).format('lll')}
          </SidecarItem>
          <SidecarItem heading="Active jobs">{cronJob?.active}</SidecarItem>
          <SidecarItem heading="Suspended">
            {cronJob?.suspend ? 'True' : 'False'}
          </SidecarItem>
          <SidecarItem heading="Concurrency policy">
            {cronJob?.concurrencyPolicy}
          </SidecarItem>
          <SidecarItem heading="Starting deadline seconds">
            {cronJob?.startingDeadlineSeconds ?? 0}
          </SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={cronJob} />
    </ResourceDetails>
  )
}

export function CronJobJobs(): ReactElement {
  const { name, namespace } = useParams()
  const columns = useJobsColumns()

  return (
    <>
      <section>
        <SubTitle>Active Jobs</SubTitle>
        <ResourceList<
          JobListT,
          JobT,
          CronJobJobsQuery,
          CronJobJobsQueryVariables
        >
          namespaced
          columns={columns}
          query={useCronJobJobsQuery}
          queryOptions={{
            variables: {
              namespace,
              name,
              active: 'true',
            } as CronJobJobsQueryVariables,
          }}
          queryName="handleGetCronJobJobs"
          itemsKey="jobs"
        />
      </section>
      <section>
        <SubTitle>Inactive Jobs</SubTitle>
        <ResourceList<
          JobListT,
          JobT,
          CronJobJobsQuery,
          CronJobJobsQueryVariables
        >
          namespaced
          columns={columns}
          query={useCronJobJobsQuery}
          queryOptions={{
            variables: {
              namespace,
              name,
              active: 'false',
            } as CronJobJobsQueryVariables,
          }}
          queryName="handleGetCronJobJobs"
          itemsKey="jobs"
        />
      </section>
    </>
  )
}

export function CronJobEvents(): ReactElement {
  const { name, namespace } = useParams()
  const columns = useEventsColumns()

  return (
    <ResourceList<
      EventListT,
      EventT,
      CronJobEventsQuery,
      CronJobEventsQueryVariables
    >
      namespaced
      columns={columns}
      query={useCronJobEventsQuery}
      queryOptions={{
        variables: { namespace, name } as CronJobEventsQueryVariables,
      }}
      queryName="handleGetCronJobEvents"
      itemsKey="events"
      disableOnRowClick
    />
  )
}
