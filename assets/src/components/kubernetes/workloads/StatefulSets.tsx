import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useSetBreadcrumbs } from '@pluralsh/design-system'

import {
  Maybe,
  Statefulset_StatefulSetList as StatefulSetListT,
  Statefulset_StatefulSet as StatefulSetT,
  StatefulSetsQuery,
  StatefulSetsQueryVariables,
  useStatefulSetsQuery,
} from '../../../generated/graphql-kubernetes'
import { ResourceList } from '../common/ResourceList'
import { useDefaultColumns } from '../common/utils'
import { UsageText } from '../../cluster/TableElements'
import { ClusterTinyFragment } from '../../../generated/graphql'
import {
  STATEFUL_SETS_REL_PATH,
  getWorkloadsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'

import { WorkloadImages, WorkloadStatusChip } from './utils'
import { getWorkloadsBreadcrumbs } from './Workloads'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
  ...getWorkloadsBreadcrumbs(cluster),
  {
    label: 'stateful sets',
    url: `${getWorkloadsAbsPath(cluster?.id)}/${STATEFUL_SETS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<StatefulSetT>()

const colImages = columnHelper.accessor((ss) => ss, {
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

const colPods = columnHelper.accessor((ss) => ss.podInfo, {
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

const colStatus = columnHelper.accessor((ss) => ss.podInfo, {
  id: 'status',
  header: 'Status',
  cell: ({ getValue }) => <WorkloadStatusChip podInfo={getValue()} />,
})

export default function StatefulSets() {
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
      StatefulSetListT,
      StatefulSetT,
      StatefulSetsQuery,
      StatefulSetsQueryVariables
    >
      namespaced
      columns={columns}
      query={useStatefulSetsQuery}
      queryName="handleGetStatefulSetList"
      itemsKey="statefulSets"
    />
  )
}
