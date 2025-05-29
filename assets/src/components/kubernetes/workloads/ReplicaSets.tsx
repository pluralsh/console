import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { KubernetesClusterFragment } from '../../../generated/graphql'

import {
  Maybe,
  Replicaset_ReplicaSet as ReplicaSetT,
  Replicaset_ReplicaSetList as ReplicaSetListT,
  ReplicaSetsDocument,
  ReplicaSetsQuery,
  ReplicaSetsQueryVariables,
} from '../../../generated/graphql-kubernetes'
import {
  getWorkloadsAbsPath,
  REPLICA_SETS_REL_PATH,
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

export default function ReplicaSets() {
  const cluster = useCluster()
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
      queryDocument={ReplicaSetsDocument}
      queryName="handleGetReplicaSets"
      itemsKey="replicaSets"
    />
  )
}
