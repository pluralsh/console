import { createColumnHelper } from '@tanstack/react-table'
import React, { useMemo } from 'react'
import { useTheme } from 'styled-components'
import {
  ChipList,
  IconFrame,
  PushPinIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useParams } from 'react-router-dom'

import {
  Types_CustomResourceDefinition as CustomResourceDefinitionT,
  CustomResourceDefinitionsQuery,
  CustomResourceDefinitionsQueryVariables,
  Types_CustomResourceDefinitionList as CustomResourceListT,
  Maybe,
  useCustomResourceDefinitionsQuery,
} from '../../../generated/graphql-kubernetes'
import { getBaseBreadcrumbs, useDefaultColumns } from '../common/utils'
import { ResourceList } from '../common/ResourceList'
import {
  KubernetesClusterFragment,
  usePinCustomResourceMutation,
} from '../../../generated/graphql'
import { getCustomResourcesAbsPath } from '../../../routes/kubernetesRoutesConsts'
import { useCluster, useIsPinnedResource } from '../Cluster'

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

const _colPin = columnHelper.accessor((crd) => crd, {
  id: 'pin',
  header: '',
  cell: ({ getValue }) => {
    const crd = getValue()

    return (
      crd &&
      crd.group &&
      crd.version &&
      crd.names?.kind && (
        <PinCustomResourceDefinition
          group={crd.group}
          version={crd.version}
          kind={crd.names.kind}
          namespaced={crd.scope?.toLowerCase() === 'namespaced'}
        />
      )
    )
  },
})

function PinCustomResourceDefinition({
  group,
  version,
  kind,
  namespaced,
}: {
  group: string
  version: string
  kind: string
  namespaced: boolean
}) {
  const { clusterId } = useParams()
  const isPinned = useIsPinnedResource(kind, version, group)
  const [mutation] = usePinCustomResourceMutation({
    variables: {
      attributes: {
        group,
        version,
        kind,
        namespaced,
        clusterId,
        displayName: kind, // TODO: Add modal with input so users can pick it on their own.
      },
    },
    onError: (error) => console.error(error), // TODO: Handle errors.
    // TODO: Refetch on complete.
  })

  return (
    !isPinned && (
      <IconFrame
        icon={<PushPinIcon />}
        textValue="Pin custom resource"
        tooltip
        size="medium"
        clickable
        onClick={(e) => {
          e.stopPropagation()
          mutation()
        }}
      />
    )
  )
}

export default function CustomResourceDefinitions() {
  const theme = useTheme()
  const cluster = useCluster()
  // const pinnedResources = usePinnedResources()

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
      // colPin,
      colAction,
    ],
    [colAction, colLabels, colCreationTimestamp]
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
          CustomResourceDefinitionT,
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
