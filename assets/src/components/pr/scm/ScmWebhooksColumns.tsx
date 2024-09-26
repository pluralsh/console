import {
  ArrowTopRightIcon,
  CopyIcon,
  ListBoxItem,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import styled, { useTheme } from 'styled-components'

import {
  ScmType,
  ScmWebhookFragment,
  ScmWebhooksDocument,
  useDeleteScmWebhookMutation,
} from 'generated/graphql'
import { Edge, removeConnection, updateCache } from 'utils/graphql'

import CopyButton from 'components/utils/CopyButton'
import { DateTimeCol } from 'components/utils/table/DateTimeCol'
import { TruncateStart } from 'components/utils/table/Truncate'

import { MoreMenu } from 'components/utils/MoreMenu'

import { useState } from 'react'

import { Confirm } from 'components/utils/Confirm'

import { ScmTypeCell, scmTypeToLabel } from './PrScmConnectionsColumns'
import { SCM_WEBHOOKS_Q_VARS } from './ScmWebhooks'

export const columnHelper = createColumnHelper<Edge<ScmWebhookFragment>>()

// const ColName = columnHelper.accessor(({ node }) => node?.name, {
//   id: 'name',
//   header: 'Name',
//   meta: { truncate: true },
//   cell: function Cell({ getValue }) {
//     return <>{getValue()}</>
//   },
// })

const ColOwner = columnHelper.accessor(({ node }) => node?.owner, {
  id: 'owner',
  header: 'Organization or group name',
  cell: function Cell({ getValue }) {
    return <span>{getValue()}</span>
  },
})

const ColInsertedAt = columnHelper.accessor(({ node }) => node?.insertedAt, {
  id: 'insertedAt',
  header: 'Created',
  cell: function Cell({ getValue }) {
    return <DateTimeCol date={getValue()} />
  },
})

export const ColType = columnHelper.accessor(({ node }) => node?.type, {
  id: 'type',
  header: 'Provider type',
  cell: ScmTypeCell,
})

const TruncateUrl = styled(TruncateStart)((_) => ({ width: 'auto' }))

export const ColUrl = columnHelper.accessor(({ node }) => node?.url, {
  id: 'url',
  header: 'URL',
  meta: { gridTemplate: `minmax(100px, 1fr)` },
  cell: function Cell({ getValue }) {
    const theme = useTheme()
    const url = getValue()

    return (
      <div
        css={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.small,
        }}
      >
        <TruncateUrl css={{ flexGrow: 1 }}>{url}</TruncateUrl>
        <CopyButton text={url} />
      </div>
    )
  },
})

function getWebhookUrl(scmWebhook: Nullable<ScmWebhookFragment>) {
  if (scmWebhook?.type === ScmType.Github) {
    return `https://github.com/organizations/${scmWebhook.owner}/settings/hooks`
  }
  if (scmWebhook?.type === ScmType.Gitlab) {
    return `https://gitlab.com/groups/${scmWebhook.owner}/-/hooks`
  }

  return undefined
}

function DeleteScmWebhookModal({
  scmWebhook,
  open,
  onClose,
}: {
  scmWebhook: ScmWebhookFragment
  open: boolean
  onClose: Nullable<() => void>
}) {
  const theme = useTheme()
  const [mutation, { loading, error }] = useDeleteScmWebhookMutation({
    variables: { id: scmWebhook.id },
    update: (cache, { data }) =>
      updateCache(cache, {
        variables: SCM_WEBHOOKS_Q_VARS,
        query: ScmWebhooksDocument,
        update: (prev) =>
          removeConnection(prev, data?.deleteScmWebhook, 'scmWebhooks'),
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
            “{scmWebhook.name}”
          </span>{' '}
          webhook?
        </>
      }
    />
  )
}

enum MenuItemKey {
  Manage = 'manage',
  Copy = 'copy',
  Delete = 'delete',
}

export const ColActions = columnHelper.display({
  id: 'actions',
  header: '',
  cell: function Cell({ row }) {
    const theme = useTheme()
    const [menuKey, setMenuKey] = useState<MenuItemKey | ''>()
    const scmWebhook = row.original.node
    const url = scmWebhook?.url
    const scmName = scmWebhook?.type ? scmTypeToLabel[scmWebhook?.type] : ''

    if (!scmWebhook) {
      return null
    }

    if (menuKey === MenuItemKey.Manage) {
      window.open(getWebhookUrl(scmWebhook), '_blank', 'noopener,noreferrer')
      setMenuKey('')
    }

    if (menuKey === MenuItemKey.Copy) {
      if (url) {
        navigator.clipboard.writeText(url)
      }
      setMenuKey('')
    }

    return (
      <>
        <MoreMenu onSelectionChange={(newKey) => setMenuKey(newKey)}>
          <ListBoxItem
            key={MenuItemKey.Manage}
            leftContent={<ArrowTopRightIcon color="icon-default" />}
            label={
              <a css={{ textDecoration: 'none', color: 'inherit' }}>
                {`Manage${scmName ? ` on ${scmName}` : ''}`}
              </a>
            }
            textValue="Manage"
          />
          <ListBoxItem
            key={MenuItemKey.Copy}
            leftContent={<CopyIcon color={theme.colors['icon-default']} />}
            label="Copy webhook URL"
            textValue="Copy webhook URL"
          />
          <ListBoxItem
            key={MenuItemKey.Delete}
            leftContent={
              <TrashCanIcon color={theme.colors['icon-danger-critical']} />
            }
            label="Delete webhook"
            textValue="Delete webhook"
          />
        </MoreMenu>
        {/* Modals */}
        <DeleteScmWebhookModal
          scmWebhook={scmWebhook}
          open={menuKey === MenuItemKey.Delete}
          onClose={() => setMenuKey('')}
        />
      </>
    )
  },
})

export const columns = [ColType, ColOwner, ColUrl, ColInsertedAt, ColActions]
