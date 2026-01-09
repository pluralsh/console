import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'

import { KubernetesClusterFragment, Maybe } from '../../../generated/graphql'
import {
  ConfigmapConfigMap,
  ConfigmapConfigMapList,
} from '../../../generated/kubernetes'
import {
  getAllConfigMapsInfiniteOptions,
  getConfigMapsInfiniteOptions,
} from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'
import {
  CONFIG_MAPS_REL_PATH,
  getConfigurationAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import { useCluster } from '../Cluster'
import { useDataSelect } from '../common/DataSelect'
import { UpdatedResourceList } from '../common/UpdatedResourceList'
import { useDefaultColumns } from '../common/utils'

import { getConfigurationBreadcrumbs } from './Configuration'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getConfigurationBreadcrumbs(cluster),
  {
    label: 'config maps',
    url: `${getConfigurationAbsPath(cluster?.id)}/${CONFIG_MAPS_REL_PATH}`,
  },
]

const columnHelper = createColumnHelper<ConfigmapConfigMap>()

export default function ConfigMaps() {
  const cluster = useCluster()
  const { hasNamespaceFilterActive } = useDataSelect()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  const { colAction, colName, colNamespace, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [colName, colNamespace, colLabels, colCreationTimestamp, colAction],
    [colName, colNamespace, colLabels, colCreationTimestamp, colAction]
  )

  return (
    <UpdatedResourceList<ConfigmapConfigMapList, ConfigmapConfigMap>
      namespaced
      columns={columns}
      queryOptions={
        hasNamespaceFilterActive
          ? getConfigMapsInfiniteOptions
          : getAllConfigMapsInfiniteOptions
      }
      itemsKey="items"
    />
  )
}
