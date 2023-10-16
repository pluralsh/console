import { Table, Tooltip } from '@pluralsh/design-system'
import { Row, createColumnHelper } from '@tanstack/react-table'
import { TableText } from 'components/cluster/TableElements'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'

import { useTheme } from 'styled-components'

import { DeleteJob } from './Job'
import { InfoSectionH2, PaddedCard, PropWideBold } from './common'

const columnHelper = createColumnHelper<any>()

const columns = (namespace, refetch) => [
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

function CronJobJobs({ jobs, namespace, refetch }) {
  const navigate = useNavigate()

  return (
    <Table
      data={jobs}
      columns={columns(namespace, refetch)}
      onRowClick={(_e, { original }: Row<any>) =>
        navigate(
          `/apps/${namespace}/components/job/${original?.metadata?.name}`
        )
      }
    />
  )
}

export default function CronJob() {
  const theme = useTheme()
  const { appName } = useParams()
  const { data, refetch } = useOutletContext<any>()

  if (!data?.cronJob) return null

  const { cronJob } = data

  return (
    <div css={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <InfoSectionH2 css={{ marginBottom: theme.spacing.medium }}>
        Jobs
      </InfoSectionH2>
      <CronJobJobs
        jobs={cronJob.jobs}
        namespace={appName}
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
