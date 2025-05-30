import { useSetBreadcrumbs } from '@pluralsh/design-system'

import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { KubernetesClusterFragment } from '../../../generated/graphql'
import {
  Configmap_ConfigMap as ConfigMapT,
  Configmap_ConfigMapList as ConfigMapListT,
  ConfigMapsDocument,
  ConfigMapsQuery,
  ConfigMapsQueryVariables,
  Maybe,
} from '../../../generated/graphql-kubernetes'
import {
  CONFIG_MAPS_REL_PATH,
  getConfigurationAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'
import { ResourceList } from '../common/ResourceList'

import { useDefaultColumns } from '../common/utils'

import { getConfigurationBreadcrumbs } from './Configuration'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getConfigurationBreadcrumbs(cluster),
  {
    label: 'config maps',
    url: `${getConfigurationAbsPath(cluster?.id)}/${CONFIG_MAPS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<ConfigMapT>()

export default function ConfigMaps() {
  const cluster = useCluster()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  const { colAction, colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colNamespace, colLabels, colCreationTimestamp, colAction],
    [colName, colNamespace, colLabels, colCreationTimestamp, colAction]
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
      queryDocument={ConfigMapsDocument}
      queryName="handleGetConfigMapList"
      itemsKey="items"
    />
  )
}
