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

const columnHelper = createColumnHelper<CronJobT>()

export default function CronJobs() {
  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colNamespace, colLabels, colCreationTimestamp],
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
