import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useSetBreadcrumbs } from '@pluralsh/design-system'

import {
  Job_JobList as JobListT,
  Job_Job as JobT,
  JobsQuery,
  JobsQueryVariables,
  Maybe,
  useJobsQuery,
  JobsDocument,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../common/utils'
import { ResourceList } from '../common/ResourceList'
import { UsageText } from '../../cluster/TableElements'
import { KubernetesClusterFragment } from '../../../generated/graphql'
import {
  JOBS_REL_PATH,
  getWorkloadsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'

import { WorkloadImages, WorkloadStatusChip } from './utils'
import { getWorkloadsBreadcrumbs } from './Workloads'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getWorkloadsBreadcrumbs(cluster),
  {
    label: 'jobs',
    url: `${getWorkloadsAbsPath(cluster?.id)}/${JOBS_REL_PATH}`,
  },
]

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

export function useJobsColumns(): Array<object> {
  const { colAction, colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)

  return useMemo(
    () => [
      colName,
      colNamespace,
      colImages,
      colPods,
      colStatus,
      colLabels,
      colCreationTimestamp,
      colAction,
    ],
    [colName, colNamespace, colLabels, colCreationTimestamp, colAction]
  )
}

export default function Jobs() {
  const cluster = useCluster()
  const columns = useJobsColumns()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  return (
    <ResourceList<JobListT, JobT, JobsQuery, JobsQueryVariables>
      namespaced
      columns={columns}
      queryDocument={JobsDocument}
      queryName="handleGetJobList"
      itemsKey="jobs"
    />
  )
}
