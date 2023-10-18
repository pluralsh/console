import { Table, Tooltip } from '@pluralsh/design-system'
import { Row, createColumnHelper } from '@tanstack/react-table'
import { TableText } from 'components/cluster/TableElements'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { useMemo } from 'react'

import { ServiceDeploymentComponentFragment } from 'generated/graphql'
import { getServiceComponentPath } from 'routes/cdRoutesConsts'

import { ComponentDetailsContext } from '../ComponentDetails'

import { DeleteJob } from './Job'
import { InfoSectionH2, PaddedCard, PropWideBold } from './common'

const columnHelper = createColumnHelper<any>()

const getColumns = (namespace, refetch) => [
  columnHelper.accessor((row) => row?.metadata?.name, {
    id: 'name',
    cell: (props) => (
      <Tooltip
        label={props.getValue()}
        placement="top-start"
      >
        <TableText>{props.getValue()}</TableText>
      </Tooltip>
    ),
    header: 'Name',
  }),
  columnHelper.accessor((row) => row?.status, {
    id: 'startEnd',
    cell: (props) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const theme = useTheme()
      const status = props.getValue()

      return (
        <div>
          <div>{status?.startTime}</div>
          <div
            css={{
              ...theme.partials.text.caption,
              color: theme.colors['text-xlight'],
            }}
          >
            {status.completionTime}
          </div>
        </div>
      )
    },
    header: 'Start / Completion time',
  }),
  columnHelper.accessor((row) => row?.status?.active || 0, {
    id: 'active',
    cell: (props) => props.getValue(),
    header: 'Active',
  }),
  columnHelper.accessor((row) => row?.status?.failed || 0, {
    id: 'failed',
    cell: (props) => props.getValue(),
    header: 'Failed',
  }),
  columnHelper.accessor((row) => row?.status?.succeeded || 0, {
    id: 'succeeded',
    cell: (props) => props.getValue(),
    header: 'Succeeded',
  }),
  columnHelper.accessor((row) => row?.metadata?.name, {
    id: 'delete',
    cell: (props) => (
      <DeleteJob
        name={props.getValue()}
        namespace={namespace}
        refetch={refetch}
      />
    ),
    header: '',
  }),
]

export function getJobPath({
  serviceId,
  serviceComponents,
  namespace,
  name,
  clusterName,
}: {
  serviceId: string | undefined
  serviceComponents:
    | (ServiceDeploymentComponentFragment | null | undefined)[]
    | null
    | undefined
  namespace: string | null | undefined
  name: string
  clusterName: string | undefined
}) {
  let jobPath = ''

  if (serviceId) {
    const job = serviceComponents?.find(
      (component) =>
        component?.kind.toLowerCase() === 'job' &&
        (component.namespace || '') === (namespace || '') &&
        (component.name || '') === (name || '')
    )

    if (job && clusterName) {
      jobPath = getServiceComponentPath({
        serviceId,
        clusterName,
        componentId: job.id,
      })
    }
  } else {
    jobPath = `/apps/${namespace}/components/job/${name}`
  }

  return jobPath
}

function CronJobJobs({ jobs, namespace, refetch }) {
  const navigate = useNavigate()
  const columns = useMemo(
    () => getColumns(namespace, refetch),
    [namespace, refetch]
  )
  const { serviceComponents, serviceId, clusterName } =
    useOutletContext<ComponentDetailsContext>()

  return (
    <Table
      data={jobs}
      columns={columns}
      // TODO: Verify links are correct when we have CronJobs to test
      onRowClick={(_e, { original }: Row<any>) => {
        const jobPath = getJobPath({
          serviceId,
          serviceComponents,
          namespace,
          name: original?.metadata.name,
          clusterName,
        })

        if (jobPath) {
          navigate(jobPath)
        }
      }}
    />
  )
}

export default function CronJob() {
  const theme = useTheme()
  const { data, refetch, component } = useOutletContext<any>()
  const namespace = component.namespace?.toLowerCase()

  if (!data?.cronJob) return null

  const { cronJob } = data

  return (
    <div css={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <InfoSectionH2 css={{ marginBottom: theme.spacing.medium }}>
        Jobs
      </InfoSectionH2>
      <CronJobJobs
        jobs={cronJob.jobs}
        namespace={namespace}
        refetch={refetch}
      />
      <InfoSectionH2
        css={{
          marginBottom: theme.spacing.medium,
          marginTop: theme.spacing.large,
        }}
      >
        Status
      </InfoSectionH2>
      <PaddedCard>
        <PropWideBold title="Last scheduled">
          {cronJob.status?.lastScheduleTime || 0}
        </PropWideBold>
      </PaddedCard>
      <InfoSectionH2
        css={{
          marginBottom: theme.spacing.medium,
          marginTop: theme.spacing.large,
        }}
      >
        Spec
      </InfoSectionH2>
      <PaddedCard>
        <PropWideBold title="Schedule">
          {cronJob.spec?.schedule || '-'}
        </PropWideBold>
        <PropWideBold title="Concurrency">
          {cronJob.spec?.concurrencyPolicy || '-'}
        </PropWideBold>
        <PropWideBold title="Suspended">
          {cronJob.spec?.suspend ? 'Yes' : 'No'}
        </PropWideBold>
      </PaddedCard>
    </div>
  )
}
