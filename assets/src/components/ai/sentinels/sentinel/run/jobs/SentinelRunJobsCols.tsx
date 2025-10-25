import { isNullish } from '@apollo/client/cache/inmemory/helpers'
import { CaretRightIcon, IconFrame } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { SentinelStatusChip } from 'components/ai/sentinels/SentinelsTableCols'
import { ClusterNameAndIcon } from 'components/cd/services/ServicesColumns'
import { DateTimeCol } from 'components/utils/table/DateTimeCol'
import { Body2P } from 'components/utils/typography/Text'
import {
  SentinelRunJobStatus,
  SentinelRunJobTinyFragment,
  SentinelRunStatus,
} from 'generated/graphql'
import { duration } from 'utils/datetime'

const columnHelper = createColumnHelper<SentinelRunJobTinyFragment>()

export const sentinelRunJobsCols = [
  columnHelper.accessor((job) => job.cluster, {
    id: 'cluster',
    header: 'Cluster',
    cell: ({ getValue }) => <ClusterNameAndIcon cluster={getValue()} />,
  }),
  columnHelper.accessor(
    (job) => `${job.reference?.namespace ?? '-'}/${job.reference?.name ?? '-'}`,
    { id: 'job', header: 'Job', meta: { gridTemplate: '1fr' } }
  ),
  columnHelper.accessor(
    (job) =>
      isNullish(job.completedAt) || isNullish(job.insertedAt)
        ? '---'
        : duration(job.insertedAt, job.completedAt),
    {
      id: 'duration',
      header: 'Duration',
      cell: ({ getValue }) => <Body2P>{getValue()}</Body2P>,
    }
  ),
  columnHelper.accessor((job) => job.insertedAt, {
    id: 'started',
    header: 'Started',
    cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
  }),
  columnHelper.accessor((job) => job.completedAt, {
    id: 'completed',
    header: 'Completed',
    cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
  }),
  columnHelper.accessor((job) => job.status, {
    id: 'status',
    header: 'Status',
    cell: ({ getValue }) => (
      <SentinelStatusChip
        showSeverity
        status={jobStatusToSentinelRunStatus(getValue())}
      />
    ),
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: () => (
      <IconFrame
        clickable
        tooltip="View job details"
        icon={<CaretRightIcon />}
      />
    ),
  }),
]

// to make ts happy
const jobStatusToSentinelRunStatus = (
  status: SentinelRunJobStatus
): SentinelRunStatus => {
  switch (status) {
    case SentinelRunJobStatus.Pending:
      return SentinelRunStatus.Pending
    case SentinelRunJobStatus.Success:
      return SentinelRunStatus.Success
    case SentinelRunJobStatus.Failed:
      return SentinelRunStatus.Failed
    default:
      return SentinelRunStatus.Pending
  }
}
