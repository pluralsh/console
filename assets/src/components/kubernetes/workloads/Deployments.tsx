import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import {
  Deployment_DeploymentList as DeploymentListT,
  Deployment_Deployment as DeploymentT,
  DeploymentsQuery,
  DeploymentsQueryVariables,
  useDeploymentsQuery,
} from '../../../generated/graphql-kubernetes'
import { ResourceList } from '../ResourceList'
import { useDefaultColumns } from '../utils'

import { WorkloadStatusChip } from './utils'

const columnHelper = createColumnHelper<DeploymentT>()

const colStatus = columnHelper.accessor((deployment) => deployment.pods, {
  id: 'status',
  header: 'Status',
  cell: ({ getValue }) => <WorkloadStatusChip podInfo={getValue()} />,
})

export default function Deployments() {
  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colNamespace, colStatus, colLabels, colCreationTimestamp],
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
