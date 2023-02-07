import { Card, Table, Tooltip } from '@pluralsh/design-system'
import { Row, createColumnHelper } from '@tanstack/react-table'
import { TableText } from 'components/cluster/TableElements'
import PropWide from 'components/utils/PropWide'
import { Div, Flex, H2 } from 'honorable'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'

import { DeleteJob } from './Job'

const columnHelper = createColumnHelper<any>()

const columns = (namespace, refetch) => [
  columnHelper.accessor(row => row?.metadata?.name, {
    id: 'name',
    cell: (props => (
      <Tooltip
        label={props.getValue()}
        placement="top-start"
      >
        <TableText>{props.getValue()}</TableText>
      </Tooltip>
    )),
    header: 'Name',
  }),
  columnHelper.accessor(row => row?.status, {
    id: 'startEnd',
    cell: props => {
      const status = props.getValue()

      return (
        <Div>
          <Div>{status?.startTime}</Div>
          <Div
            caption
            color="text-xlight"
          >
            {status.completionTime}
          </Div>
        </Div>
      )
    },
    header: 'Start / Completion time',
  }),
  columnHelper.accessor(row => row?.status?.active || 0, {
    id: 'active',
    cell: props => props.getValue(),
    header: 'Active',
  }),
  columnHelper.accessor(row => row?.status?.failed || 0, {
    id: 'failed',
    cell: props => props.getValue(),
    header: 'Failed',
  }),
  columnHelper.accessor(row => row?.status?.succeeded || 0, {
    id: 'succeeded',
    cell: props => props.getValue(),
    header: 'Succeeded',
  }),
  columnHelper.accessor(row => row?.metadata?.name, {
    id: 'delete',
    cell: props => (
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
      onRowClick={(_e, { original }: Row<any>) => navigate(`/apps/${namespace}/components/job/${original?.metadata?.name}`)}
    />
  )
}

export default function CronJob() {
  const { appName } = useParams()
  const { data, refetch } = useOutletContext<any>()

  if (!data?.cronJob) return null

  const { cronJob } = data

  return (
    <Flex
      direction="column"
    >
      <H2 marginBottom="medium">Jobs</H2>
      <CronJobJobs
        jobs={cronJob.jobs}
        namespace={appName}
        refetch={refetch}
      />
      <H2
        marginBottom="medium"
        marginTop="large"
      >
        Status
      </H2>
      <Card padding="large">
        <PropWide
          title="Last scheduled"
          fontWeight={600}
        >
          {cronJob.status?.lastScheduleTime || 0}
        </PropWide>
      </Card>
      <H2
        marginBottom="medium"
        marginTop="large"
      >
        Spec
      </H2>
      <Card padding="large">
        <PropWide
          title="Schedule"
          fontWeight={600}
        >
          {cronJob.spec?.schedule || '-'}
        </PropWide>
        <PropWide
          title="Concurrency"
          fontWeight={600}
        >
          {cronJob.spec?.concurrencyPolicy || '-'}
        </PropWide>

        <PropWide
          title="Suspended"
          fontWeight={600}
        >
          {cronJob.spec?.suspend ? 'Yes' : 'No'}
        </PropWide>
      </Card>
    </Flex>
  )
}
