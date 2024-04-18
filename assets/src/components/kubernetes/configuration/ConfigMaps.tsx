import { useMemo } from 'react'

import { createColumnHelper } from '@tanstack/react-table'

import { useSetBreadcrumbs } from '@pluralsh/design-system'

import { useDefaultColumns } from '../common/utils'
import { ResourceList } from '../common/ResourceList'
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
} from '../../../routes/kubernetesRoutesConsts'
import { KubernetesClusterFragment } from '../../../generated/graphql'
import { useCluster } from '../Cluster'

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
      query={useConfigMapsQuery}
      queryName="handleGetConfigMapList"
      itemsKey="items"
    />
  )
}
