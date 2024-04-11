import { createColumnHelper } from '@tanstack/react-table'
import React, { useMemo } from 'react'
import { useTheme } from 'styled-components'
import { ChipList, useSetBreadcrumbs } from '@pluralsh/design-system'

import {
  CustomResourceDefinitionsQuery,
  CustomResourceDefinitionsQueryVariables,
  Types_CustomResourceDefinitionList as CustomResourceListT,
  Types_CustomResourceDefinition as CustomResourceT,
  Maybe,
  useCustomResourceDefinitionsQuery,
} from '../../../generated/graphql-kubernetes'
import { getBaseBreadcrumbs, useDefaultColumns } from '../common/utils'
import { ResourceList } from '../common/ResourceList'

import { ClusterTinyFragment } from '../../../generated/graphql'
import { getCustomResourcesAbsPath } from '../../../routes/kubernetesRoutesConsts'

import { useClusterContext } from '../Cluster'

import { CRDEstablishedChip } from './utils'

export const getBreadcrumbs = (cluster?: Maybe<ClusterTinyFragment>) => [
  ...getBaseBreadcrumbs(cluster),
  {
    label: 'custom resources',
    url: getCustomResourcesAbsPath(cluster?.id),
  },
]

const columnHelper = createColumnHelper<CustomResourceT>()

const colName = columnHelper.accessor((r) => r?.objectMeta.name, {
  id: 'name',
  header: 'Name',
  enableSorting: true,
  cell: ({ getValue }) => (
    <span
      css={{
        maxWidth: 350,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {getValue()}
    </span>
  ),
})

const colGroup = columnHelper.accessor((crd) => crd?.group, {
  id: 'group',
  header: 'Group',
  cell: ({ getValue }) => getValue(),
})

const colVersion = columnHelper.accessor((crd) => crd?.version, {
  id: 'version',
  header: 'Version',
  cell: ({ getValue }) => getValue(),
})

const colScope = columnHelper.accessor((crd) => crd?.scope, {
  id: 'scope',
  header: 'Scope',
  cell: ({ getValue }) => getValue(),
})

const colEstablished = columnHelper.accessor((crd) => crd?.established, {
  id: 'established',
  header: 'Established',
  cell: ({ getValue }) => <CRDEstablishedChip established={getValue()} />,
})

const colCategories = columnHelper.accessor((crd) => crd?.names.categories, {
  id: 'categories',
  header: 'Categories',
  cell: ({ getValue }) => {
    const categories = getValue()

    return (
      <ChipList
        size="small"
        limit={1}
        values={categories ?? []}
        emptyState={<span>-</span>}
      />
    )
  },
})

export default function CustomResourceDefinitions() {
  const theme = useTheme()
  const { cluster } = useClusterContext()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  const { colLabels, colCreationTimestamp } = useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [
      colName,
      colGroup,
      colVersion,
      colScope,
      colEstablished,
      colCategories,
      colLabels,
      colCreationTimestamp,
    ],
    [colLabels, colCreationTimestamp]
  )

  return (
    <div
      css={{
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      <div
        css={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          paddingTop: theme.spacing.medium,
          paddingBottom: theme.spacing.large,
        }}
      >
        <ResourceList<
          CustomResourceListT,
          CustomResourceT,
          CustomResourceDefinitionsQuery,
          CustomResourceDefinitionsQueryVariables
        >
          columns={columns}
          query={useCustomResourceDefinitionsQuery}
          queryName="handleGetCustomResourceDefinitionList"
          itemsKey="items"
        />
      </div>
    </div>
  )
}
