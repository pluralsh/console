import { useMemo } from 'react'

import { createColumnHelper } from '@tanstack/react-table'

import { useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'
import {
  Configmap_ConfigMapList as ConfigMapListT,
  Configmap_ConfigMap as ConfigMapT,
  ConfigMapsQuery,
  ConfigMapsQueryVariables,
  useConfigMapsQuery,
} from '../../../generated/graphql-kubernetes'

const columnHelper = createColumnHelper<ConfigMapT>()

export default function ConfigMaps() {
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
