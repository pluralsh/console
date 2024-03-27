import { useMemo } from 'react'

import { createColumnHelper } from '@tanstack/react-table'

import { useSetBreadcrumbs } from '@pluralsh/design-system'

import { getBaseBreadcrumbs, useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'
import {
  Configmap_ConfigMapList as ConfigMapListT,
  Configmap_ConfigMap as ConfigMapT,
  ConfigMapsQuery,
  ConfigMapsQueryVariables,
  Maybe,
  useConfigMapsQuery,
} from '../../../generated/graphql-kubernetes'
import {
  CONFIG_MAPS_REL_PATH,
  getConfigurationAbsPath,
  getKubernetesAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { ClusterTinyFragment } from '../../../generated/graphql'
import { useKubernetesContext } from '../Kubernetes'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
  ...getBaseBreadcrumbs(cluster),
  {
    label: 'configuration',
    url: getConfigurationAbsPath(cluster?.id),
  },
  {
    label: 'config maps',
    url: `${getConfigurationAbsPath(cluster?.id)}/${CONFIG_MAPS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<ConfigMapT>()

export default function ConfigMaps() {
  const { cluster } = useKubernetesContext()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  const { colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colNamespace, colLabels, colCreationTimestamp],
    [colName, colNamespace, colLabels, colCreationTimestamp]
  )

  return (
    <ResourceList<
      ConfigMapListT,
      ConfigMapT,
      ConfigMapsQuery,
      ConfigMapsQueryVariables
    >
      namespaced
      columns={columns}
      query={useConfigMapsQuery}
      queryName="handleGetConfigMapList"
      itemsKey="items"
    />
  )
}
