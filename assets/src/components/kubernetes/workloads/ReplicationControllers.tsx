import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { KubernetesClusterFragment } from '../../../generated/graphql'

import {
  Maybe,
  Replicationcontroller_ReplicationController as ReplicationControllerT,
  Replicationcontroller_ReplicationControllerList as ReplicationControllerListT,
  ReplicationControllersDocument,
  ReplicationControllersQuery,
  ReplicationControllersQueryVariables,
} from '../../../generated/graphql-kubernetes'
import {
  getWorkloadsAbsPath,
  REPLICATION_CONTROLLERS_REL_PATH,
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
      ReplicationControllerListT,
      ReplicationControllerT,
      ReplicationControllersQuery,
      ReplicationControllersQueryVariables
    >
      namespaced
      columns={columns}
      queryDocument={ReplicationControllersDocument}
      queryName="handleGetReplicationControllerList"
      itemsKey="replicationControllers"
    />
  )
}
