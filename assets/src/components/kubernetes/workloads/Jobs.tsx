import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import {
  Job_JobList as JobListT,
  Job_Job as JobT,
  JobsQuery,
  JobsQueryVariables,
  useJobsQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'
import { UsageText } from '../../cluster/TableElements'

const columnHelper = createColumnHelper<JobT>()

const colImages = columnHelper.accessor((job) => job, {
  id: 'images',
  header: 'Images',
  cell: ({ getValue }) => {
    const job = getValue()

    return (
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          maxWidth: 300,
        }}
      >
        {[
          ...(job.initContainerImages ?? []),
          ...(job.containerImages ?? []),
        ]?.map((image) => (
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
    )
  },
})

const colPods = columnHelper.accessor((job) => job.podInfo, {
  id: 'pods',
  header: 'Pods',
  cell: ({ getValue }) => {
    const podInfo = getValue()

    return (
      <UsageText>
        {podInfo.running} / {podInfo.desired}
      </UsageText>
    )
  },
})

export default function CronJobs() {
  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [
      colName,
      colNamespace,
      colImages,
      colPods,
      colLabels,
      colCreationTimestamp,
    ],
    [colName, colNamespace, colLabels, colCreationTimestamp]
  )

  return (
    <ResourceList<JobListT, JobT, JobsQuery, JobsQueryVariables>
      namespaced
      columns={columns}
      query={useJobsQuery}
      queryName="handleGetJobList"
      itemsKey="jobs"
    />
  )
}
