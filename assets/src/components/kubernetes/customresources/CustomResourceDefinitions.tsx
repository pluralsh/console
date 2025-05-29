import { ChipList, useSetBreadcrumbs } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useTheme } from 'styled-components'
import { KubernetesClusterFragment } from '../../../generated/graphql'

import {
  CustomResourceDefinitionsDocument,
  CustomResourceDefinitionsQuery,
  CustomResourceDefinitionsQueryVariables,
  Maybe,
  Types_CustomResourceDefinition as CustomResourceDefinitionT,
  Types_CustomResourceDefinitionList as CustomResourceListT,
} from '../../../generated/graphql-kubernetes'
import { getCustomResourcesAbsPath } from '../../../routes/kubernetesRoutesConsts'
import { useSetPageHeaderContent } from '../../cd/ContinuousDeployment'
import { useCluster, usePinnedResources } from '../Cluster'
import { ResourceList } from '../common/ResourceList'
import { getBaseBreadcrumbs, useDefaultColumns } from '../common/utils'
import PinCustomResourceDefinition from './PinCustomResourceDefinition'
import PinnedCustomResourceDefinitions from './PinnedCustomResourceDefinitions'

import { CRDEstablishedChip } from './utils'

export const getBreadcrumbs = (cluster?: Maybe<KubernetesClusterFragment>) => [
  ...getBaseBreadcrumbs(cluster),
  {
    label: 'custom resources',
    url: getCustomResourcesAbsPath(cluster?.id),
  },
]

const columnHelper = createColumnHelper<CustomResourceDefinitionT>()

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

const colKind = columnHelper.accessor((crd) => crd?.names?.kind, {
  id: 'kind',
  header: 'Kind',
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
  cell: ({ getValue }) => (
    <ChipList
      size="small"
      limit={1}
      values={getValue() ?? []}
      emptyState={null}
    />
  ),
})

const colPin = columnHelper.accessor((crd) => crd, {
  id: 'pin',
  header: '',
  cell: ({ getValue }) => <PinCustomResourceDefinition crd={getValue()} />,
})

export default function CustomResourceDefinitions() {
  const theme = useTheme()
  const cluster = useCluster()
  const pinnedResources = usePinnedResources()

  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(cluster), [cluster]))

  const { colAction, colLabels, colCreationTimestamp } =
    useDefaultColumns(columnHelper)
  const columns = useMemo(
    () => [
      colName,
      colGroup,
      colVersion,
      colKind,
      colScope,
      colEstablished,
      colCategories,
      colLabels,
      colCreationTimestamp,
      colPin,
      colAction,
    ],
    [colAction, colLabels, colCreationTimestamp]
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
          CustomResourceDefinitionT,
          CustomResourceDefinitionsQuery,
          CustomResourceDefinitionsQueryVariables
        >
          columns={columns}
          queryDocument={CustomResourceDefinitionsDocument}
          queryName="handleGetCustomResourceDefinitionList"
          itemsKey="items"
        />
      </div>
    </div>
  )
}
