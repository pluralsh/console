import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useSetBreadcrumbs } from '@pluralsh/design-system'

import {
  Maybe,
  Replicationcontroller_ReplicationControllerList as ReplicationControllerListT,
  Replicationcontroller_ReplicationController as ReplicationControllerT,
  ReplicationControllersQuery,
  ReplicationControllersQueryVariables,
  useReplicationControllersQuery,
} from '../../../generated/graphql-kubernetes'
import { getBaseBreadcrumbs, useDefaultColumns } from '../common/utils'
import { ResourceList } from '../common/ResourceList'
import { UsageText } from '../../cluster/TableElements'
import { ClusterTinyFragment } from '../../../generated/graphql'
import {
  REPLICATION_CONTROLLERS_REL_PATH,
  getWorkloadsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'

import { WorkloadImages, WorkloadStatusChip } from './utils'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
  ...getBaseBreadcrumbs(cluster),
  {
    label: 'workloads',
    url: getWorkloadsAbsPath(cluster?.id),
  },
  {
    label: 'replication controllers',
    url: `${getWorkloadsAbsPath(
      cluster?.id
    )}/${REPLICATION_CONTROLLERS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<ReplicationControllerT>()

const colImages = columnHelper.accessor((rc) => rc, {
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

const colPods = columnHelper.accessor((rc) => rc.podInfo, {
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

const colStatus = columnHelper.accessor((rc) => rc.podInfo, {
  id: 'status',
  header: 'Status',
  cell: ({ getValue }) => <WorkloadStatusChip podInfo={getValue()} />,
})

export default function ReplicationControllers() {
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
      ReplicationControllerListT,
      ReplicationControllerT,
      ReplicationControllersQuery,
      ReplicationControllersQueryVariables
    >
      namespaced
      columns={columns}
      query={useReplicationControllersQuery}
      queryName="handleGetReplicationControllerList"
      itemsKey="replicationControllers"
    />
  )
}
