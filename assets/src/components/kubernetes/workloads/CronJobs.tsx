import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import { KubernetesClusterFragment } from '../../../generated/graphql'
import { Maybe } from 'generated/graphql-plural'
import {
  CronjobCronJob,
  CronjobCronJobList,
} from '../../../generated/kubernetes'
import {
  getAllCronJobsInfiniteOptions,
  getCronJobsInfiniteOptions,
} from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'
import {
  CRON_JOBS_REL_PATH,
  getWorkloadsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { DateTimeCol } from '../../utils/table/DateTimeCol'
import { useCluster } from '../Cluster'
import { useDataSelect } from '../common/DataSelect.tsx'
import { ResourceList } from '../common/ResourceList.tsx'
import { useDefaultColumns } from '../common/utils'
import { CronJobSuspendChip, WorkloadImages } from './utils'
import { getWorkloadsBreadcrumbs } from './Workloads'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getWorkloadsBreadcrumbs(cluster),
  {
    label: 'cron jobs',
    url: `${getWorkloadsAbsPath(cluster?.id)}/${CRON_JOBS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<CronjobCronJob>()

const colSchedule = columnHelper.accessor((cj) => cj.schedule, {
  id: 'schedule',
  header: 'Schedule',
  cell: ({ getValue }) => getValue(),
})

const colImages = columnHelper.accessor((cj) => cj.containerImages, {
  id: 'images',
  header: 'Images',
  cell: ({ getValue }) => <WorkloadImages images={getValue()} />,
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

const colLastSchedule = columnHelper.accessor((cj) => cj.lastSchedule.Time, {
  id: 'lastSchedule',
  header: 'Last schedule',
  cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
})

export default function CronJobs() {
  const cluster = useCluster()
  const { hasNamespaceFilterActive } = useDataSelect()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  const { colAction, colName, colNamespace, colLabels, colCreationTimestamp } =
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
      colAction,
    ],
    [colName, colNamespace, colLabels, colCreationTimestamp, colAction]
  )

  return (
    <ResourceList<CronjobCronJobList, CronjobCronJob>
      namespaced
      columns={columns}
      queryOptions={
        hasNamespaceFilterActive
          ? getCronJobsInfiniteOptions
          : getAllCronJobsInfiniteOptions
      }
      itemsKey="items"
    />
  )
}
