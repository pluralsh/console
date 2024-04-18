import { createColumnHelper } from '@tanstack/react-table'
import React, { useMemo, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import {
  ChipList,
  CloseIcon,
  IconFrame,
  PushPinIcon,
  SubTab,
  TabList,
  Toast,
  Tooltip,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useParams } from 'react-router-dom'

import { ApolloError } from 'apollo-boost'

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
  PinnedCustomResourceFragment,
  usePinCustomResourceMutation,
} from '../../../generated/graphql'
import {
  getCustomResourcesAbsPath,
  getResourceDetailsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import {
  useCluster,
  useIsPinnedResource,
  usePinnedResources,
  useRefetch,
} from '../Cluster'

import { LinkTabWrap } from '../../utils/Tabs'
import { useSetPageHeaderContent } from '../../cd/ContinuousDeployment'

import { Kind } from '../common/types'

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
  cell: ({ getValue }) => {
    const crd = getValue()

    return (
      crd?.objectMeta?.name &&
      crd?.group &&
      crd?.version &&
      crd?.names?.kind &&
      crd?.scope && (
        <PinCustomResourceDefinition
          name={crd.objectMeta.name}
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
  name,
  group,
  version,
  kind,
  namespaced,
}: {
  name: string
  group: string
  version: string
  kind: string
  namespaced: boolean
}) {
  const { clusterId } = useParams()
  const refetchClusters = useRefetch()
  const isPinned = useIsPinnedResource(kind, version, group)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<ApolloError>()
  const [mutation] = usePinCustomResourceMutation({
    variables: {
      attributes: {
        name,
        group,
        version,
        kind,
        namespaced,
        clusterId,
        displayName: kind, // TODO: Add modal with input so users can pick it on their own.
      },
    },
    onError: (error) => {
      setError(error)
      setTimeout(() => setError(undefined), 3000)
    },
    onCompleted: () => {
      refetchClusters?.()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    },
  })

  return (
    <>
      {!isPinned && (
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
      )}
      {success && (
        <Toast
          severity="success"
          margin="large"
          marginRight="xxxxlarge"
        >
          Resource pinned successfully
        </Toast>
      )}
      {error && (
        <Toast
          heading="Error pinning resource"
          severity="danger"
          margin="large"
          marginRight="xxxxlarge"
        >
          {error.message}
        </Toast>
      )}
    </>
  )
}

const DeleteIcon = styled(CloseIcon)(({ theme }) => ({
  marginLeft: theme.spacing.xxsmall,
  padding: theme.spacing.xxsmall,
  opacity: 0,
  '&:hover': {
    color: theme.colors['icon-danger'],
  },
}))

const LinkContainer = styled(LinkTabWrap)(() => ({
  [`:hover ${DeleteIcon}`]: { opacity: 1 },
}))

function PinnedCustomResourceDefinitions({
  cluster,
  pinnedResources,
}: {
  cluster?: KubernetesClusterFragment
  pinnedResources: Maybe<PinnedCustomResourceFragment>[]
}) {
  const tabStateRef = useRef<any>(null)

  return (
    <TabList
      scrollable
      gap="xxsmall"
      stateRef={tabStateRef}
      stateProps={{ orientation: 'horizontal', selectedKey: '' }}
      paddingBottom="xxsmall"
    >
      {pinnedResources
        .filter((pr): pr is PinnedCustomResourceFragment => !!pr)
        .map(({ name, displayName }) => (
          <LinkContainer
            subTab
            key={name}
            textValue={name}
            to={getResourceDetailsAbsPath(
              cluster?.id,
              Kind.CustomResourceDefinition,
              name
            )}
          >
            <SubTab
              key={name}
              textValue={name}
              css={{ display: 'flex' }}
            >
              {displayName}
              <Tooltip label="Unpin custom resource">
                <DeleteIcon size={12} />
              </Tooltip>
            </SubTab>
          </LinkContainer>
        ))}
    </TabList>
  )
}

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
          query={useCustomResourceDefinitionsQuery}
          queryName="handleGetCustomResourceDefinitionList"
          itemsKey="items"
        />
      </div>
    </div>
  )
}
