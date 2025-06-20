import { ReactElement, useState } from 'react'
import {
  BitBucketIcon,
  GitHubLogoIcon,
  GitLabLogoIcon,
  IconFrame,
  ListBoxItem,
  PencilIcon,
  PrOpenIcon,
  TrashCanIcon,
  WebhooksIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import styled, { useTheme } from 'styled-components'

import {
  ScmConnectionFragment,
  ScmConnectionsDocument,
  ScmType,
  useDeleteScmConnectionMutation,
} from 'generated/graphql'

import { Edge, removeConnection, updateCache } from 'utils/graphql'
import { Confirm } from 'components/utils/Confirm'
import { TruncateStart } from 'components/utils/table/Truncate'
import { StackedText } from 'components/utils/table/StackedText'
import { MoreMenu } from 'components/utils/MoreMenu'

import { EditScmConnectionModal } from './EditScmConnection'
import { CreateScmConnectionWebhookModal } from './CreateScmConnectionWebhook'

enum MenuItemKey {
  Edit = 'edit',
  Delete = 'delete',
  CreateWebhook = 'createWebhook',
}

export const columnHelper = createColumnHelper<Edge<ScmConnectionFragment>>()

const ColName = columnHelper.accessor(({ node }) => node?.name, {
  id: 'name',
  header: 'Connection name',
  cell: function Cell({ getValue }) {
    return <>{getValue()}</>
  },
})

const ColBaseUrl = columnHelper.accessor(({ node }) => node?.baseUrl, {
  id: 'baseUrl',
  header: 'Base url',
  meta: { truncate: true },
  cell: function Cell({ getValue }) {
    return <TruncateStart>{getValue()}</TruncateStart>
  },
})

const ColApiUrl = columnHelper.accessor(({ node }) => node?.apiUrl, {
  id: 'apiUrl',
  header: 'API url',
  meta: { truncate: true },
  cell: function Cell({ getValue }) {
    return <TruncateStart>{getValue()}</TruncateStart>
  },
})

const DynamicScmTypeIconSC = styled.div((_) => ({
  position: 'relative',
}))

export const scmTypeToLabel = {
  [ScmType.Github]: 'GitHub',
  [ScmType.Gitlab]: 'GitLab',
  [ScmType.Bitbucket]: 'BitBucket',
  '': 'Unknown',
} as const satisfies Record<ScmType | '', string>

export const scmTypeToIcon = {
  [ScmType.Github]: <GitHubLogoIcon fullColor />,
  [ScmType.Gitlab]: <GitLabLogoIcon fullColor />,
  [ScmType.Bitbucket]: <BitBucketIcon fullColor />,
  '': <PrOpenIcon />,
} as const satisfies Record<ScmType | '', ReactElement<any>>

export function DynamicScmTypeIcon({ type }: { type: Nullable<ScmType> }) {
  const icon = scmTypeToIcon[type || ''] || scmTypeToIcon['']

  return (
    <DynamicScmTypeIconSC>
      <IconFrame
        size="medium"
        type="tertiary"
        icon={icon}
      />
    </DynamicScmTypeIconSC>
  )
}

const ColTypeSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
}))

export function ScmTypeCell({ getValue }) {
  const type = getValue()
  const label = scmTypeToLabel[type || ''] || scmTypeToLabel['']

  return (
    <ColTypeSC>
      <DynamicScmTypeIcon type={type} />
      <StackedText first={label} />
    </ColTypeSC>
  )
}
export const ColType = columnHelper.accessor(({ node }) => node?.type, {
  id: 'type',
  header: 'Provider type',
  cell: ScmTypeCell,
})

export function DeleteScmConnectionModal({
  scmConnection,
  open,
  onClose,
}: {
  scmConnection: ScmConnectionFragment
  open: boolean
  onClose: Nullable<() => void>
}) {
  const theme = useTheme()
  const [mutation, { loading, error }] = useDeleteScmConnectionMutation({
    variables: { id: scmConnection.id },
    update: (cache, { data }) =>
      updateCache(cache, {
        variables: {},
        query: ScmConnectionsDocument,
        update: (prev) =>
          removeConnection(prev, data?.deleteScmConnection, 'scmConnections'),
      }),
    onCompleted: () => {
      onClose?.()
    },
  })

  return (
    <Confirm
      close={() => onClose?.()}
      destructive
      label="Delete"
      loading={loading}
      error={error}
      open={open}
      submit={() => mutation()}
      title="Delete SCM connection"
      text={
        <>
          Are you sure you want to delete the{' '}
          <span css={{ color: theme.colors['text-danger'] }}>
            “{scmConnection.name}”
          </span>{' '}
          connection?
        </>
      }
    />
  )
}

export const ColActions = columnHelper.display({
  id: 'actions',
  header: '',
  cell: function Cell({ row }) {
    const theme = useTheme()
    const scmConnection = row.original?.node
    const [menuKey, setMenuKey] = useState<MenuItemKey | ''>()

    if (!scmConnection) {
      return null
    }

    return (
      <>
        <MoreMenu onSelectionChange={(newKey) => setMenuKey(newKey)}>
          <ListBoxItem
            key={MenuItemKey.CreateWebhook}
            leftContent={<WebhooksIcon />}
            label="Create webhook"
            textValue="Create webhook"
          />
          <ListBoxItem
            key={MenuItemKey.Edit}
            leftContent={<PencilIcon />}
            label="Edit connection"
            textValue="Edit connection"
          />
          <ListBoxItem
            key={MenuItemKey.Delete}
            leftContent={
              <TrashCanIcon color={theme.colors['icon-danger-critical']} />
            }
            label="Delete connection"
            textValue="Delete connection"
          />
        </MoreMenu>
        {/* Modals */}
        <CreateScmConnectionWebhookModal
          connection={scmConnection}
          open={menuKey === MenuItemKey.CreateWebhook}
          onClose={() => setMenuKey('')}
        />
        <EditScmConnectionModal
          scmConnection={scmConnection}
          open={menuKey === MenuItemKey.Edit}
          onClose={() => setMenuKey('')}
        />
        <DeleteScmConnectionModal
          scmConnection={scmConnection}
          open={menuKey === MenuItemKey.Delete}
          onClose={() => setMenuKey('')}
        />
      </>
    )
  },
})

export const columns = [ColType, ColName, ColBaseUrl, ColApiUrl, ColActions]
