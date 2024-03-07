import { ReactElement, useState } from 'react'
import {
  GitHubLogoIcon,
  IconFrame,
  ListBoxItem,
  PencilIcon,
  SlackLogoIcon,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import styled, { useTheme } from 'styled-components'

import {
  NotificationSinkFragment,
  PrRole,
  SinkType,
  useDeleteNotificationSinkMutation,
} from 'generated/graphql'

import { Edge } from 'utils/graphql'
import { Confirm } from 'components/utils/Confirm'
import { TruncateEnd } from 'components/utils/table/TruncateStart'
import { MoreMenu } from 'components/utils/MoreMenu'

import { EditNotificationSinkModal } from './CreateNotificationSinkModal'

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
const ColUrl = columnHelper.accessor(
  ({ node }) =>
    node?.configuration?.slack?.url || node?.configuration?.teams?.url || '',
  {
    id: 'url',
    header: 'Webhook',
    meta: { gridTemplate: 'minmax(100px, 1fr)' },
    cell: function Cell({ getValue, row }) {
      const theme = useTheme()
      const type = row.original.node?.type
      const icon = sinkTypeToIcon[type || '']

      return (
        <div
          css={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
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
          <TruncateEnd>{getValue()}</TruncateEnd>
        </div>
      )
    },
  }
)

const DynamicSinkIconSC = styled.div((_) => ({
  position: 'relative',
}))

export const sinkTypeToIcon = {
  [SinkType.Slack]: <SlackLogoIcon />,
  [SinkType.Teams]: <GitHubLogoIcon />,
  '': null,
} as const satisfies Record<SinkType | '', ReactElement | null>

export function DynamicRoleIcon({ role }: { role: Nullable<PrRole> }) {
  const icon = sinkTypeToIcon[role || ''] || sinkTypeToIcon['']

  return (
    <DynamicSinkIconSC>
      <IconFrame
        size="medium"
        type="secondary"
        icon={icon}
      />
    </DynamicSinkIconSC>
  )
}

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

export const columns = [ColName, ColUrl, ColActions]
