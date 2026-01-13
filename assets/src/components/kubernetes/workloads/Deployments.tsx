import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import { KubernetesClusterFragment, Maybe } from '../../../generated/graphql'

import {
  DEPLOYMENTS_REL_PATH,
  getWorkloadsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { UsageText } from '../../cluster/TableElements'

import { useCluster } from '../Cluster'
import { ResourceList } from '../common/ResourceList.tsx'
import { useDefaultColumns } from '../common/utils'

import { WorkloadImages, WorkloadStatusChip } from './utils'
import { getWorkloadsBreadcrumbs } from './Workloads'
import {
  getAllDeploymentsInfiniteOptions,
  getDeploymentsInfiniteOptions,
} from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'

import { useDataSelect } from '../common/DataSelect.tsx'
import {
  DeploymentDeployment,
  DeploymentDeploymentList,
} from '../../../generated/kubernetes'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getWorkloadsBreadcrumbs(cluster),
  {
    label: 'deployments',
    url: `${getWorkloadsAbsPath(cluster?.id)}/${DEPLOYMENTS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<DeploymentDeployment>()

const colImages = columnHelper.accessor((deployment) => deployment, {
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

const colPods = columnHelper.accessor((deployment) => deployment.pods, {
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

const colStatus = columnHelper.accessor((deployment) => deployment.pods, {
  id: 'status',
  header: 'Status',
  cell: ({ getValue }) => <WorkloadStatusChip podInfo={getValue()} />,
})

export default function Deployments() {
  const cluster = useCluster()
  const { hasNamespaceFilterActive } = useDataSelect()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  const { colName, colNamespace, colLabels, colCreationTimestamp, colAction } =
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
    <ResourceList<DeploymentDeploymentList, DeploymentDeployment>
      namespaced
      columns={columns}
      queryOptions={
        hasNamespaceFilterActive
          ? getDeploymentsInfiniteOptions
          : getAllDeploymentsInfiniteOptions
      }
      itemsKey="deployments"
    />
  )
}
