import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import { KubernetesClusterFragment } from '../../../generated/graphql'

import {
  Daemonset_DaemonSet as DaemonSetT,
  Daemonset_DaemonSetList as DaemonSetListT,
  DaemonSetsDocument,
  DaemonSetsQuery,
  DaemonSetsQueryVariables,
  Maybe,
} from '../../../generated/graphql-kubernetes'
import {
  DAEMON_SETS_REL_PATH,
  getWorkloadsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'

import { UsageText } from '../../cluster/TableElements'

import { useCluster } from '../Cluster'
import { ResourceList } from '../common/ResourceList'
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
    <ResourceList<
      DaemonSetListT,
      DaemonSetT,
      DaemonSetsQuery,
      DaemonSetsQueryVariables
    >
      namespaced
      columns={columns}
      queryDocument={DaemonSetsDocument}
      queryName="handleGetDaemonSetList"
      itemsKey="daemonSets"
    />
  )
}
