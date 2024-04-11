import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useSetBreadcrumbs } from '@pluralsh/design-system'

import {
  Deployment_DeploymentList as DeploymentListT,
  Deployment_Deployment as DeploymentT,
  DeploymentsQuery,
  DeploymentsQueryVariables,
  Maybe,
  useDeploymentsQuery,
} from '../../../generated/graphql-kubernetes'
import { ResourceList } from '../common/ResourceList'
import { getBaseBreadcrumbs, useDefaultColumns } from '../common/utils'
import { UsageText } from '../../cluster/TableElements'
import { ClusterTinyFragment } from '../../../generated/graphql'
import {
  DEPLOYMENTS_REL_PATH,
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
    label: 'deployments',
    url: `${getWorkloadsAbsPath(cluster?.id)}/${DEPLOYMENTS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<DeploymentT>()

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
  const { cluster } = useClusterContext()

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
      DeploymentListT,
      DeploymentT,
      DeploymentsQuery,
      DeploymentsQueryVariables
    >
      namespaced
      columns={columns}
      query={useDeploymentsQuery}
      queryName="handleGetDeployments"
      itemsKey="deployments"
    />
  )
}
