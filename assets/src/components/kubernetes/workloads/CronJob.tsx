import {
  Button,
  ChipList,
  PlayIcon,
  SidecarItem,
  Toast,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ReactElement, useMemo, useState } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { formatLocalizedDateTime } from 'utils/datetime'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AxiosInstance } from '../../../helpers/axios.ts'

import {
  CommonEvent,
  CommonEventList,
  JobJob,
  JobJobList,
} from '../../../generated/kubernetes'
import {
  getCronJobEventsInfiniteOptions,
  getCronJobJobsInfiniteOptions,
  getCronJobOptions,
  triggerCronJobMutation,
} from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'
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
import { UpdatedResourceList } from '../common/UpdatedResourceList'

import { Kind } from '../common/types'
import { GqlError } from '../../utils/Alert'
import { MetadataSidecar } from '../common/utils'
import { NAMESPACE_PARAM } from '../Navigation'
import { getBreadcrumbs } from './CronJobs'
import { useJobsColumns } from './Jobs'

const directory: Array<TabEntry> = [
  { path: 'jobs', label: 'Jobs' },
  { path: 'events', label: 'Events' },
  { path: 'raw', label: 'Raw' },
] as const

export default function CronJob(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId = '', name = '', namespace = '' } = useParams()
  const [triggerBanner, setTriggerBanner] = useState(false)

  const {
    data: cronJob,
    isFetching,
    error,
    refetch,
  } = useQuery({
    ...getCronJobOptions({
      client: AxiosInstance(clusterId),
      path: { name, namespace },
    }),
    refetchInterval: 30_000,
  })

  const mutation = useMutation({
    ...triggerCronJobMutation(),
    onSuccess: () => {
      refetch()
      setTriggerBanner(true)
      setTimeout(() => setTriggerBanner(false), 3000)
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

  if (error) {
    return <GqlError error={error} />
  }

  if (isFetching) {
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
            onClick={() =>
              mutation.mutate({
                client: AxiosInstance(clusterId),
                path: { name, namespace },
              })
            }
            loading={mutation.isPending}
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
              {formatLocalizedDateTime(cronJob?.lastSchedule.Time)}
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
      {mutation.error && (
        <Toast
          heading="Error triggering cron job"
          severity="danger"
          margin="large"
          marginRight="xxxxlarge"
        >
          {mutation.error.message}
        </Toast>
      )}
    </>
  )
}

export function CronJobJobs(): ReactElement<any> {
  const { name = '', namespace = '' } = useParams()
  const columns = useJobsColumns()

  return (
    <>
      <section>
        <SubTitle>Active Jobs</SubTitle>
        <UpdatedResourceList<JobJobList, JobJob>
          namespaced
          columns={columns}
          initialSort={[{ id: 'creationTimestamp', desc: true }]}
          queryOptions={getCronJobJobsInfiniteOptions}
          pathParams={{ name, namespace }}
          queryParams={{ active: 'true' }}
          itemsKey="jobs"
        />
      </section>
      <section>
        <SubTitle>Inactive Jobs</SubTitle>
        <UpdatedResourceList<JobJobList, JobJob>
          namespaced
          columns={columns}
          initialSort={[{ id: 'creationTimestamp', desc: true }]}
          queryOptions={getCronJobJobsInfiniteOptions}
          pathParams={{ name, namespace }}
          queryParams={{ active: 'false' }}
          itemsKey="jobs"
          maxHeight="500px"
        />
      </section>
    </>
  )
}

export function CronJobEvents(): ReactElement<any> {
  const { name = '', namespace = '' } = useParams()
  const columns = useEventsColumns()

  return (
    <UpdatedResourceList<CommonEventList, CommonEvent>
      namespaced
      columns={columns}
      queryOptions={getCronJobEventsInfiniteOptions}
      pathParams={{ name, namespace }}
      itemsKey="events"
      disableOnRowClick
    />
  )
}
