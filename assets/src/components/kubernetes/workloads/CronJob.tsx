import {
  Button,
  ChipList,
  PlayIcon,
  SidecarItem,
  Toast,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ApolloError } from 'apollo-boost'
import { ReactElement, useMemo, useState } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { formatLocalizedDateTime } from 'utils/datetime'

import {
  CronJobEventsQuery,
  CronJobEventsQueryVariables,
  CronJobJobsQuery,
  CronJobJobsQueryVariables,
  CronJobQueryVariables,
  Cronjob_CronJobDetail as CronJobT,
  CronJobTriggerMutationVariables,
  Common_EventList as EventListT,
  Common_Event as EventT,
  Job_JobList as JobListT,
  Job_Job as JobT,
  useCronJobEventsQuery,
  useCronJobJobsQuery,
  useCronJobQuery,
  useCronJobTriggerMutation,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import {
  CRON_JOBS_REL_PATH,
  getResourceDetailsAbsPath,
  getWorkloadsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { SubTitle } from '../../utils/SubTitle'
import { useCluster } from '../Cluster'
import { useEventsColumns } from '../cluster/Events'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import { ResourceList } from '../common/ResourceList'
import { MetadataSidecar } from '../common/utils'
import { NAMESPACE_PARAM } from '../Navigation'

import { Kind } from '../common/types'

import { getBreadcrumbs } from './CronJobs'
import { useJobsColumns } from './Jobs'

const directory: Array<TabEntry> = [
  { path: 'jobs', label: 'Jobs' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
] as const

export default function CronJob(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId, name, namespace } = useParams()
  const [triggerBanner, setTriggerBanner] = useState(false)
  const [error, setError] = useState<ApolloError>()

  const { data, loading, refetch } = useCronJobQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: { name, namespace } as CronJobQueryVariables,
  })

  const [mutation, { loading: mutationLoading }] = useCronJobTriggerMutation({
    client: KubernetesClient(clusterId ?? ''),
    variables: { name, namespace } as CronJobTriggerMutationVariables,
    onCompleted: () => {
      refetch({ name, namespace })
      setTriggerBanner(true)
      setTimeout(() => setTriggerBanner(false), 3000)
    },
    onError: (error) => {
      setError(error)
      setTimeout(() => setError(undefined), 3000)
    },
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
          url: getResourceDetailsAbsPath(
            clusterId,
            Kind.CronJob,
            name,
            namespace
          ),
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
    <>
      <ResourceDetails
        tabs={directory}
        additionalHeaderContent={
          <Button
            floating
            startIcon={<PlayIcon />}
            onClick={() => mutation()}
            loading={mutationLoading}
          >
            Trigger
          </Button>
        }
        sidecar={
          <MetadataSidecar resource={cronJob}>
            <SidecarItem heading="Images">
              <ChipList
                size="small"
                limit={3}
                values={cronJob?.containerImages ?? []}
                emptyState={<div>-</div>}
              />
            </SidecarItem>
            <SidecarItem heading="Schedule">{cronJob?.schedule}</SidecarItem>
            <SidecarItem heading="Last schedule">
              {formatLocalizedDateTime(cronJob?.lastSchedule)}
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
      {triggerBanner && (
        <Toast
          severity="success"
          margin="large"
          marginRight="xxxxlarge"
        >
          Cron job triggered successfully
        </Toast>
      )}
      {error && (
        <Toast
          heading="Error triggering cron job"
          severity="danger"
          margin="large"
          marginRight="xxxxlarge"
        >
          {error.message}
        </Toast>
      )}
    </>
  )
}

export function CronJobJobs(): ReactElement<any> {
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
          initialSort={[{ id: 'creationTimestamp', desc: true }]}
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
          initialSort={[{ id: 'creationTimestamp', desc: true }]}
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
          maxHeight="500px"
        />
      </section>
    </>
  )
}

export function CronJobEvents(): ReactElement<any> {
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
