import { useState } from 'react'
import { ListBoxItem, PencilIcon, TrashCanIcon } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useTheme } from 'styled-components'

import {
  NotificationRouterFragment,
  useDeleteNotificationRouterMutation,
} from 'generated/graphql'

import { Edge } from 'utils/graphql'
import { Confirm } from 'components/utils/Confirm'
import { MoreMenu } from 'components/utils/MoreMenu'

enum MenuItemKey {
  Edit = 'edit',
  Delete = 'delete',
}

export const columnHelper =
  createColumnHelper<Edge<NotificationRouterFragment>>()

const ColName = columnHelper.accessor(({ node }) => node?.name, {
  id: 'name',
  header: 'Router name',
  cell: function Cell({ getValue }) {
    return <>{getValue()}</>
  },
})

export function DeleteNotificationRouterModal({
  notificationRouter,
  refetch,
  open,
  onClose,
}: {
  notificationRouter: NotificationRouterFragment
  refetch: Nullable<() => void>
  open: boolean
  onClose: Nullable<() => void>
}) {
  const theme = useTheme()
  const [mutation, { loading, error }] = useDeleteNotificationRouterMutation({
    variables: { id: notificationRouter.id },
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
      title="Delete notification router"
      text={
        <>
          Are you sure you want to delete the{' '}
          <span css={{ color: theme.colors['text-danger'] }}>
            “{notificationRouter.name}”
          </span>{' '}
          notification router?
        </>
      }
    />
  )
}

export const ColActions = columnHelper.accessor(({ node }) => node, {
  id: 'actions',
  header: '',
  cell: function Cell({ table, getValue }) {
    const theme = useTheme()
    const notificationRouter = getValue()
    const [menuKey, setMenuKey] = useState<MenuItemKey | ''>()
    const { refetch } = table.options.meta as { refetch?: () => void }

    if (!notificationRouter) {
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
            label="Edit router"
            textValue="Edit router"
          />
          <ListBoxItem
            key={MenuItemKey.Delete}
            leftContent={
              <TrashCanIcon color={theme.colors['icon-danger-critical']} />
            }
            label="Delete router"
            textValue="Delete router"
          />
        </MoreMenu>
        {/* Modals */}
        <DeleteNotificationRouterModal
          notificationRouter={notificationRouter}
          refetch={refetch}
          open={menuKey === MenuItemKey.Delete}
          onClose={() => setMenuKey('')}
        />
      </div>
    )
  },
})

export const columns = [ColName, ColActions]
