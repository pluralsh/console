import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { KubernetesClusterFragment } from '../../../generated/graphql'

import {
  Maybe,
  Poddisruptionbudget_PodDisruptionBudget as PodDisruptionBudgetT,
  Poddisruptionbudget_PodDisruptionBudgetList as PodDisruptionBudgetListT,
  PodDisruptionBudgetsDocument,
  PodDisruptionBudgetsQuery,
  PodDisruptionBudgetsQueryVariables,
} from '../../../generated/graphql-kubernetes'
import {
  getClusterAbsPath,
  PDBS_REL_PATH,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'
import { ResourceList } from '../common/ResourceList'
import { useDefaultColumns } from '../common/utils'

import { getClusterBreadcrumbs } from './Cluster.tsx'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getClusterBreadcrumbs(cluster),
  {
    label: 'pod disruption budgets',
    url: `${getClusterAbsPath(cluster?.id)}/${PDBS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<PodDisruptionBudgetT>()

export const usePodDisruptionBudgetListColumns = () => {
  const { colAction, colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)

  return useMemo(
    () => [
      colName,
      colNamespace,
      columnHelper.accessor((pdb) => pdb.minAvailable, {
        id: 'minAvailable',
        header: 'Min available',
        cell: ({ getValue }) => getValue(),
      }),
      columnHelper.accessor((pdb) => pdb.maxUnavailable, {
        id: 'maxUnavailable',
        header: 'Max unavailable',
        cell: ({ getValue }) => getValue(),
      }),
      colLabels,
      colCreationTimestamp,
      colAction,
    ],
    [colCreationTimestamp, colLabels, colName, colNamespace, colAction]
  )
}

export default function PodDisruptionBudgets() {
  const cluster = useCluster()
  const columns = usePodDisruptionBudgetListColumns()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  return (
    <ResourceList<
      PodDisruptionBudgetListT,
      PodDisruptionBudgetT,
      PodDisruptionBudgetsQuery,
      PodDisruptionBudgetsQueryVariables
    >
      namespaced
      columns={columns}
      queryDocument={PodDisruptionBudgetsDocument}
      queryName="handleGetPodDisruptionBudgetList"
      itemsKey="items"
    />
  )
}
