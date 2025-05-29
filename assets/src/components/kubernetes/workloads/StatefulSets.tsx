import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { KubernetesClusterFragment } from '../../../generated/graphql'

import {
  Maybe,
  Statefulset_StatefulSet as StatefulSetT,
  Statefulset_StatefulSetList as StatefulSetListT,
  StatefulSetsDocument,
  StatefulSetsQuery,
  StatefulSetsQueryVariables,
} from '../../../generated/graphql-kubernetes'
import {
  getWorkloadsAbsPath,
  STATEFUL_SETS_REL_PATH,
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
      StatefulSetListT,
      StatefulSetT,
      StatefulSetsQuery,
      StatefulSetsQueryVariables
    >
      namespaced
      columns={columns}
      queryDocument={StatefulSetsDocument}
      queryName="handleGetStatefulSetList"
      itemsKey="statefulSets"
    />
  )
}
