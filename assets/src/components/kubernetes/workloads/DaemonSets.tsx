import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import { KubernetesClusterFragment } from '../../../generated/graphql'
import { Maybe } from 'generated/graphql-plural'
import {
  DaemonsetDaemonSet,
  DaemonsetDaemonSetList,
} from '../../../generated/kubernetes'
import {
  getAllDaemonSetsInfiniteOptions,
  getDaemonSetsInfiniteOptions,
} from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'
import {
  DAEMON_SETS_REL_PATH,
  getWorkloadsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'

import { UsageText } from '../../cluster/TableElements'

import { useCluster } from '../Cluster'
import { useDataSelect } from '../common/DataSelect.tsx'
import { UpdatedResourceList } from '../common/UpdatedResourceList'
import { useDefaultColumns } from '../common/utils'

import { WorkloadImages, WorkloadStatusChip } from './utils'
import { getWorkloadsBreadcrumbs } from './Workloads'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getWorkloadsBreadcrumbs(cluster),
  {
    label: 'daemon sets',
    url: `${getWorkloadsAbsPath(cluster?.id)}/${DAEMON_SETS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<DaemonsetDaemonSet>()

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

export default function DaemonSets() {
  const cluster = useCluster()
  const { hasNamespaceFilterActive } = useDataSelect()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  const { colAction, colName, colNamespace, colLabels, colCreationTimestamp } =
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
      colAction,
    ],
    [colName, colNamespace, colLabels, colCreationTimestamp, colAction]
  )

  return (
    <UpdatedResourceList<DaemonsetDaemonSetList, DaemonsetDaemonSet>
      namespaced
      columns={columns}
      queryOptions={
        hasNamespaceFilterActive
          ? getDaemonSetsInfiniteOptions
          : getAllDaemonSetsInfiniteOptions
      }
      itemsKey="daemonSets"
    />
  )
}
