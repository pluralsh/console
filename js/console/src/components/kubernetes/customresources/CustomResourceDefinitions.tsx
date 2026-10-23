import { ChipList, Flex, useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { KubernetesClusterFragment, Maybe } from '../../../generated/graphql'

import { getCustomResourceDefinitionsInfiniteOptions } from '../../../generated/kubernetes/@tanstack/react-query.gen'
import { getCustomResourcesAbsPath } from '../../../routes/kubernetesRoutesConsts'
import { useSetPageHeaderContent } from '../../cd/ContinuousDeployment'
import { useCluster, usePinnedResources } from '../Cluster'
import DeleteResourceButton from '../common/DeleteResource'
import { ResourceList } from '../common/ResourceList'
import { getBaseBreadcrumbs, useDefaultColumns } from '../common/utils'
import PinCustomResourceDefinition from './PinCustomResourceDefinition'
import PinnedCustomResourceDefinitions from './PinnedCustomResourceDefinitions'

import { CRDEstablishedChip } from './utils'
import {
  TypesCustomResourceDefinition,
  TypesCustomResourceDefinitionList,
} from 'generated/kubernetes'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getBaseBreadcrumbs(cluster),
  {
    label: 'custom resources',
    url: getCustomResourcesAbsPath(cluster?.id),
  },
]

const columnHelper = createColumnHelper<TypesCustomResourceDefinition>()

const colName = columnHelper.accessor((r) => r?.objectMeta.name, {
  id: 'name',
  header: 'Name',
  enableSorting: true,
  meta: { gridTemplate: 'minmax(160px, 2fr)', truncate: true },
  cell: ({ getValue }) => <span>{getValue()}</span>,
})

const colGroup = columnHelper.accessor((crd) => crd?.group, {
  id: 'group',
  header: 'Group',
  meta: { gridTemplate: 'minmax(80px, 1fr)', truncate: true },
  cell: ({ getValue }) => <span>{getValue()}</span>,
})

const colVersion = columnHelper.accessor((crd) => crd?.version, {
  id: 'version',
  header: 'Version',
  cell: ({ getValue }) => getValue(),
})

const colKind = columnHelper.accessor((crd) => crd?.names?.kind, {
  id: 'kind',
  header: 'Kind',
  meta: { gridTemplate: 'minmax(80px, 1fr)', truncate: true },
  cell: ({ getValue }) => <span>{getValue()}</span>,
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
  meta: { gridTemplate: 'fit-content(120px)' },
  cell: ({ getValue }) => (
    <ChipList
      size="small"
      limit={1}
      values={getValue() ?? []}
      emptyState={null}
    />
  ),
})

const colActions = columnHelper.accessor((crd) => crd, {
  id: 'actions',
  header: '',
  cell: ({ getValue, table }) => (
    <Flex gap="xsmall">
      <PinCustomResourceDefinition crd={getValue()} />
      <DeleteResourceButton
        resource={getValue()}
        refetch={table?.options?.meta?.refetch}
        customResource={table?.options?.meta?.customResource}
      />
    </Flex>
  ),
})

export default function CustomResourceDefinitions() {
  const cluster = useCluster()
  const pinnedResources = usePinnedResources()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  const { colLabels, colCreationTimestamp } = useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [
      colName,
      colGroup,
      colVersion,
      colKind,
      colScope,
      colEstablished,
      colCategories,
      {
        ...colLabels,
        meta: { ...colLabels.meta, gridTemplate: 'fit-content(160px)' },
      },
      colCreationTimestamp,
      colActions,
    ],
    [colLabels, colCreationTimestamp]
  )

  const headerContent = useMemo(
    () => (
      <PinnedCustomResourceDefinitions
        cluster={cluster}
        pinnedResources={pinnedResources}
      />
    ),
    [cluster, pinnedResources]
  )

  useSetPageHeaderContent(headerContent)

  return (
    <ResourceList<
      TypesCustomResourceDefinitionList,
      TypesCustomResourceDefinition
    >
      columns={columns}
      queryOptions={getCustomResourceDefinitionsInfiniteOptions}
      itemsKey="items"
    />
  )
}
