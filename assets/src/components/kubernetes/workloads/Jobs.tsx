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

import { WorkloadImages, WorkloadStatusChip } from './utils'

const columnHelper = createColumnHelper<JobT>()

const colImages = columnHelper.accessor((job) => job, {
  id: 'images',
  header: 'Images',
  cell: ({ getValue }) => {
    const { initContainerImages, containerImages } = getValue()

    return (
      <WorkloadImages
        images={[...(initContainerImages ?? []), ...(containerImages ?? [])]}
      />
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

const colStatus = columnHelper.accessor((job) => job.podInfo, {
  id: 'status',
  header: 'Status',
  cell: ({ getValue }) => <WorkloadStatusChip podInfo={getValue()} />,
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
      colStatus,
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
