import { ReactElement, useState } from 'react'
import {
  IconFrame,
  ListBoxItem,
  MsTeamsLogoIcon,
  PencilIcon,
  SlackLogoIcon,
  Tooltip,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useTheme } from 'styled-components'

import {
  NotificationSinkFragment,
  SinkType,
  useDeleteNotificationSinkMutation,
} from 'generated/graphql'

import { Edge } from 'utils/graphql'
import { Confirm } from 'components/utils/Confirm'
import { TruncateEnd } from 'components/utils/table/Truncate'
import { MoreMenu } from 'components/utils/MoreMenu'

import { EditNotificationSinkModal } from './UpsertNotificationSinkModal'

enum MenuItemKey {
  Edit = 'edit',
  Delete = 'delete',
}

export const columnHelper = createColumnHelper<Edge<NotificationSinkFragment>>()

const ColName = columnHelper.accessor(({ node }) => node?.name, {
  id: 'name',
  header: 'Sink',
  cell: function Cell({ getValue }) {
    return <>{getValue()}</>
  },
})

export function SinkInfo({
  sink,
}: {
  sink: Nullable<NotificationSinkFragment>
}) {
  const theme = useTheme()
  const type = sink?.type
  const icon = sinkTypeToIcon[type || '']
  const info =
    sink?.configuration?.slack?.url || sink?.configuration?.teams?.url || ''

  return (
    <div
      css={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        gap: theme.spacing.small,
      }}
    >
      {icon && (
        <IconFrame
          type="secondary"
          secondary
          icon={icon}
        />
      )}

      <Tooltip
        placement="top-start"
        label={info}
      >
        <TruncateEnd>{info}</TruncateEnd>
      </Tooltip>
    </div>
  )
}

const ColUrl = columnHelper.accessor(
  ({ node }) =>
    node?.configuration?.slack?.url || node?.configuration?.teams?.url || '',
  {
    id: 'url',
    header: 'Webhook',
    meta: { gridTemplate: 'minmax(100px, 1fr)' },
    cell: function Cell({ row }) {
      const sink = row.original.node

      if (!sink) return null

      return <SinkInfo sink={sink} />
    },
  }
)

export const sinkTypeToIcon = {
  [SinkType.Slack]: <SlackLogoIcon />,
  [SinkType.Teams]: <MsTeamsLogoIcon />,
  [SinkType.Plural]: null,
  '': null,
} as const satisfies Record<SinkType | '', ReactElement<any> | null>

export function DeleteNotificationSinkModal({
  sink,
  refetch,
  open,
  onClose,
}: {
  sink: NotificationSinkFragment
  refetch: Nullable<() => void>
  open: boolean
  onClose: Nullable<() => void>
}) {
  const theme = useTheme()
  const [mutation, { loading, error }] = useDeleteNotificationSinkMutation({
    variables: { id: sink.id },
    onCompleted: () => {
      onClose?.()
      refetch?.()
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
      title="Delete notification sink"
      text={
        <>
          Are you sure you want to delete the{' '}
          <span css={{ color: theme.colors['text-danger'] }}>
            “{sink.name}”
          </span>{' '}
          notification sink?
        </>
      }
    />
  )
}

export const ColActions = columnHelper.display({
  id: 'actions',
  header: '',
  cell: function Cell({ table, row }) {
    const theme = useTheme()
    const sink = row.original.node
    const [menuKey, setMenuKey] = useState<MenuItemKey | ''>()
    const { refetch } = table.options.meta as { refetch?: () => void }

    if (!sink) {
      return null
    }

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        css={{
          alignItems: 'center',
          alignSelf: 'end',
          display: 'flex',
          columnGap: theme.spacing.medium,
        }}
      >
        <MoreMenu onSelectionChange={(newKey) => setMenuKey(newKey)}>
          <ListBoxItem
            key={MenuItemKey.Edit}
            leftContent={<PencilIcon />}
            label="Edit sink"
            textValue="Edit sink"
          />
          <ListBoxItem
            key={MenuItemKey.Delete}
            leftContent={
              <TrashCanIcon color={theme.colors['icon-danger-critical']} />
            }
            label="Delete sink"
            textValue="Delete sink"
          />
        </MoreMenu>
        {/* Modals */}
        <DeleteNotificationSinkModal
          sink={sink}
          refetch={refetch}
          open={menuKey === MenuItemKey.Delete}
          onClose={() => setMenuKey('')}
        />
        <EditNotificationSinkModal
          sink={sink}
          open={menuKey === MenuItemKey.Edit}
          onClose={() => setMenuKey('')}
        />
      </div>
    )
  },
})

export const RouterSinkActions = columnHelper.display({
  id: 'actions',
  header: '',
  cell: function Cell({ table, row }) {
    const theme = useTheme()
    const sink = row.original.node
    const { removeSink } = table.options.meta as {
      removeSink?: (sinkId: string) => void
    }

    if (!sink) {
      return null
    }

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        css={{
          alignItems: 'center',
          alignSelf: 'end',
          display: 'flex',
          columnGap: theme.spacing.medium,
        }}
      >
        <MoreMenu
          onSelectionChange={(key) => {
            if (key === MenuItemKey.Delete) {
              removeSink?.(sink.id)
            }
          }}
        >
          <ListBoxItem
            key={MenuItemKey.Delete}
            leftContent={
              <TrashCanIcon color={theme.colors['icon-danger-critical']} />
            }
            label="Remove sink"
            textValue="Remove sink"
          />
        </MoreMenu>
      </div>
    )
  },
})

export const columns = [ColName, ColUrl, ColActions]
export const sinkEditColumns = [ColName, ColUrl, RouterSinkActions]
