import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { KubernetesClusterFragment } from '../../../generated/graphql'

import { Maybe } from 'generated/graphql-plural'
import {
  getWorkloadsAbsPath,
  JOBS_REL_PATH,
} from '../../../routes/kubernetesRoutesConsts'
import { UsageText } from '../../cluster/TableElements'
import { useCluster } from '../Cluster'
import { useDefaultColumns } from '../common/utils'

import { WorkloadImages, WorkloadStatusChip } from './utils'
import { getWorkloadsBreadcrumbs } from './Workloads'
import { ResourceList } from '../common/ResourceList.tsx'
import { JobJob, JobJobList } from '../../../generated/kubernetes'
import {
  getAllJobsInfiniteOptions,
  getJobsInfiniteOptions,
} from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'
import { useDataSelect } from '../common/DataSelect.tsx'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getWorkloadsBreadcrumbs(cluster),
  {
    label: 'jobs',
    url: `${getWorkloadsAbsPath(cluster?.id)}/${JOBS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<JobJob>()

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
  const { hasNamespaceFilterActive } = useDataSelect()
  const columns = useJobsColumns()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  return (
    <ResourceList<JobJobList, JobJob>
      namespaced
      columns={columns}
      queryOptions={
        hasNamespaceFilterActive
          ? getJobsInfiniteOptions
          : getAllJobsInfiniteOptions
      }
      itemsKey="jobs"
    />
  )
}
