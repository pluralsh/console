import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import { useSetBreadcrumbs } from '@pluralsh/design-system'

import {
  Cronjob_CronJobList as CronJobListT,
  Cronjob_CronJob as CronJobT,
  CronJobsQuery,
  CronJobsQueryVariables,
  Maybe,
  useCronJobsQuery,
} from '../../../generated/graphql-kubernetes'
import { getBaseBreadcrumbs, useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'
import { DateTimeCol } from '../../utils/table/DateTimeCol'

import { ClusterTinyFragment } from '../../../generated/graphql'
import {
  CRON_JOBS_REL_PATH,
  getConfigurationAbsPath,
  getWorkloadsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'

import { useKubernetesContext } from '../Kubernetes'

import { CronJobSuspendChip, WorkloadImages } from './utils'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
  ...getBaseBreadcrumbs(cluster),
  {
    label: 'workloads',
    url: getWorkloadsAbsPath(cluster?.id),
  },
  {
    label: 'cron jobs',
    url: `${getConfigurationAbsPath(cluster?.id)}/${CRON_JOBS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<CronJobT>()

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

const colLastSchedule = columnHelper.accessor((cj) => cj.lastSchedule, {
  id: 'lastSchedule',
  header: 'Last schedule',
  cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
})

export default function CronJobs() {
  const { cluster } = useKubernetesContext()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

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
