import { createColumnHelper } from '@tanstack/react-table'
import React, { useMemo } from 'react'

import { useTheme } from 'styled-components'

import { Span } from 'honorable'

import { ChipList } from '@pluralsh/design-system'

import {
  Types_CustomResourceDefinitionList as CustomResourceListT,
  Types_CustomResourceDefinition as CustomResourceT,
  CustomResourcesQuery,
  CustomResourcesQueryVariables,
  useCustomResourcesQuery,
} from '../../../generated/graphql-kubernetes'
import { useDefaultColumns } from '../utils'
import { ResourceList } from '../ResourceList'

const columnHelper = createColumnHelper<CustomResourceT>()

const colName = columnHelper.accessor((r) => r?.objectMeta.name, {
  id: 'name',
  header: 'Name',
  enableSorting: true,
  cell: ({ getValue }) => (
    <Span
      css={{
        maxWidth: 350,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {getValue()}
    </Span>
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

export default function CustomResources() {
  const theme = useTheme()

  const { colLabels, colCreationTimestamp } = useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [
      colName,
      colGroup,
      colVersion,
      colScope,
      colCategories,
      colLabels,
      colCreationTimestamp,
    ],
    [colName, colLabels, colCreationTimestamp]
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
          CustomResourcesQuery,
          CustomResourcesQueryVariables
        >
          columns={columns}
          query={useCustomResourcesQuery}
          queryName="handleGetCustomResourceDefinitionList"
          itemsKey="items"
        />
      </div>
    </div>
  )
}
