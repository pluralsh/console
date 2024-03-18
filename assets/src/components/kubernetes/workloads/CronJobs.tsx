import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import {
  Cronjob_CronJobList as CronJobListT,
  Cronjob_CronJob as CronJobT,
  CronJobsQuery,
  CronJobsQueryVariables,
  useCronJobsQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'
import { DateTimeCol } from '../../utils/table/DateTimeCol'
import { UsageText } from '../../cluster/TableElements'

import { CronJobSuspendChip } from './utils'

const columnHelper = createColumnHelper<CronJobT>()

const colSchedule = columnHelper.accessor((cj) => cj.schedule, {
  id: 'schedule',
  header: 'Schedule',
  cell: ({ getValue }) => getValue(),
})

const colImages = columnHelper.accessor((cj) => cj.containerImages, {
  id: 'images',
  header: 'Images',
  cell: ({ getValue }) => (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 300,
      }}
    >
      {getValue()?.map((image) => (
        <span
          css={{
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {image}
        </span>
      ))}
    </div>
  ),
})

const colSuspend = columnHelper.accessor((cj) => cj.suspend, {
  id: 'suspend',
  header: 'Suspended',
  cell: ({ getValue }) => <CronJobSuspendChip suspend={getValue()} />,
})

const colActive = columnHelper.accessor((cj) => cj.active, {
  id: 'active',
  header: 'Active',
  cell: ({ getValue }) => getValue(),
})

const colLastSchedule = columnHelper.accessor((cj) => cj.lastSchedule, {
  id: 'lastSchedule',
  header: 'Last schedule',
  cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
})

export default function CronJobs() {
  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [
      colName,
      colNamespace,
      colSchedule,
      colLastSchedule,
      colSuspend,
      colActive,
      colImages,
      colLabels,
      colCreationTimestamp,
    ],
    [colName, colNamespace, colLabels, colCreationTimestamp]
  )

  return (
    <ResourceList<CronJobListT, CronJobT, CronJobsQuery, CronJobsQueryVariables>
      namespaced
      columns={columns}
      query={useCronJobsQuery}
      queryName="handleGetCronJobList"
      itemsKey="items"
    />
  )
}
