import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useSetBreadcrumbs } from '@pluralsh/design-system'

import {
  Maybe,
  Replicaset_ReplicaSetList as ReplicaSetListT,
  Replicaset_ReplicaSet as ReplicaSetT,
  ReplicaSetsQuery,
  ReplicaSetsQueryVariables,
  useReplicaSetsQuery,
} from '../../../generated/graphql-kubernetes'
import { ResourceList } from '../common/ResourceList'
import { getBaseBreadcrumbs, useDefaultColumns } from '../common/utils'
import { UsageText } from '../../cluster/TableElements'
import { ClusterTinyFragment } from '../../../generated/graphql'
import {
  REPLICA_SETS_REL_PATH,
  getWorkloadsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useClusterContext } from '../Cluster'

import { WorkloadImages, WorkloadStatusChip } from './utils'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
  ...getBaseBreadcrumbs(cluster),
  {
    label: 'workloads',
    url: getWorkloadsAbsPath(cluster?.id),
  },
  {
    label: 'replica sets',
    url: `${getWorkloadsAbsPath(cluster?.id)}/${REPLICA_SETS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<ReplicaSetT>()

const colImages = columnHelper.accessor((rs) => rs, {
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

const colPods = columnHelper.accessor((rs) => rs.podInfo, {
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

const colStatus = columnHelper.accessor((rs) => rs.podInfo, {
  id: 'status',
  header: 'Status',
  cell: ({ getValue }) => <WorkloadStatusChip podInfo={getValue()} />,
})

export function useReplicaSetsColumns(): Array<object> {
  const { colName, colNamespace, colLabels, colCreationTimestamp } =
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
    ],
    [colName, colNamespace, colLabels, colCreationTimestamp]
  )
}

export default function ReplicaSets() {
  const { cluster } = useClusterContext()
  const columns = useReplicaSetsColumns()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  return (
    <ResourceList<
      ReplicaSetListT,
      ReplicaSetT,
      ReplicaSetsQuery,
      ReplicaSetsQueryVariables
    >
      namespaced
      columns={columns}
      query={useReplicaSetsQuery}
      queryName="handleGetReplicaSets"
      itemsKey="replicaSets"
    />
  )
}
