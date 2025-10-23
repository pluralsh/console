import { SentinelRunJobTinyFragment } from 'generated/graphql'
import { createColumnHelper } from '@tanstack/react-table'
import { ClusterNameAndIcon } from 'components/cd/services/ServicesColumns'

const columnHelper = createColumnHelper<SentinelRunJobTinyFragment>()

export const sentinelRunJobsCols = [
  columnHelper.accessor((job) => job.cluster, {
    id: 'cluster',
    header: 'Cluster',
    cell: ({ getValue }) => <ClusterNameAndIcon cluster={getValue()} />,
  }),
  columnHelper.accessor(
    (job) => `${job.reference?.namespace ?? '-'}/${job.reference?.name ?? '-'}`,
    {
      id: 'job',
      header: 'Job',
      meta: { gridTemplate: '1fr' },
    }
  ),
]
