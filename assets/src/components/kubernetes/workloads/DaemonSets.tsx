import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import { useSetBreadcrumbs } from '@pluralsh/design-system'

import {
  Daemonset_DaemonSetList as DaemonSetListT,
  Daemonset_DaemonSet as DaemonSetT,
  DaemonSetsQuery,
  DaemonSetsQueryVariables,
  Maybe,
  useDaemonSetsQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../common/utils'
import { ResourceList } from '../common/ResourceList'

import { UsageText } from '../../cluster/TableElements'

import { ClusterTinyFragment } from '../../../generated/graphql'
import {
  DAEMON_SETS_REL_PATH,
  getWorkloadsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'

import { useCluster } from '../Cluster'

import { WorkloadImages, WorkloadStatusChip } from './utils'
import { getWorkloadsBreadcrumbs } from './Workloads'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
  ...getWorkloadsBreadcrumbs(cluster),
  {
    label: 'daemon sets',
    url: `${getWorkloadsAbsPath(cluster?.id)}/${DAEMON_SETS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<DaemonSetT>()

const colImages = columnHelper.accessor((ds) => ds, {
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

const colPods = columnHelper.accessor((ds) => ds.podInfo, {
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

const colStatus = columnHelper.accessor((ds) => ds.podInfo, {
  id: 'status',
  header: 'Status',
  cell: ({ getValue }) => <WorkloadStatusChip podInfo={getValue()} />,
})

export default function CronJobs() {
  const cluster = useCluster()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

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
    <ResourceList<
      DaemonSetListT,
      DaemonSetT,
      DaemonSetsQuery,
      DaemonSetsQueryVariables
    >
      namespaced
      columns={columns}
      query={useDaemonSetsQuery}
      queryName="handleGetDaemonSetList"
      itemsKey="daemonSets"
    />
  )
}
