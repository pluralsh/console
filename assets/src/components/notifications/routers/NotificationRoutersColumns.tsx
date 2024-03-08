import { useMemo, useState } from 'react'
import {
  ListBoxItem,
  PencilIcon,
  Tooltip,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useTheme } from 'styled-components'

import {
  NotificationRouterFragment,
  ServiceFragment,
  useDeleteNotificationRouterMutation,
} from 'generated/graphql'

import { Edge } from 'utils/graphql'
import { Confirm } from 'components/utils/Confirm'
import { MoreMenu } from 'components/utils/MoreMenu'

import { isNonNullable } from 'utils/isNonNullable'

import { EditNotificationRouterModal } from './EditNotificationRouterModal'
import { compareByPrefixes } from './compareByPrefixes'
import { insertBetweenLimited } from './insertBetweenLimited'

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

const ColFilters = columnHelper.accessor(
  ({ node }) => node?.filters?.join(', ') || '',
  {
    id: 'filters',
    header: 'Filters',
    cell: function Cell({ row }) {
      const filterStrs = useMemo(() => {
        const filters = row.original.node?.filters || []

        return filters
          .flatMap((f) => {
            const ret: string[] = []

            if (f?.cluster?.name) {
              ret.push(`cluster: ${f.cluster.name}`)
            }
            if (f?.regex) {
              ret.push(`regex: ${f.regex}`)
            }
            if ((f as { service?: ServiceFragment })?.service?.metadata?.name) {
              ret.push(
                `service: ${(f as { service?: ServiceFragment }).service
                  ?.metadata?.name}`
              )
            }
            if (f?.pipeline?.name) {
              ret.push(`pipeline: ${f.pipeline.name}`)
            }

            return ret
          })
          .sort(compareByPrefixes(['regex', 'cluster', 'service', 'pipeline']))
      }, [row.original.node?.filters])
      const all = insertBetweenLimited(filterStrs, <br />)
      const limited = insertBetweenLimited(
        filterStrs,
        ', ',
        2,
        ({ length }) => `, +${length} more`
      )

      return (
        <Tooltip label={all}>
          <span>{limited}</span>
        </Tooltip>
      )
    },
  }
)

const ColSinks = columnHelper.accessor(
  ({ node }) => node?.filters?.join(', ') || '',
  {
    id: 'sinks',
    header: 'Sinks',
    cell: function Cell({ row }) {
      const sinks = row.original.node?.sinks || []
      const sinkNames = sinks.map((s) => s?.name).filter(isNonNullable)
      const all = insertBetweenLimited(sinkNames, <br />)
      const limited = insertBetweenLimited(
        sinkNames,
        <br />,
        3,
        ({ length }) => (
          <>
            <br />+{length} more
          </>
        )
      )

      return (
        <Tooltip label={all}>
          <span>{limited}</span>
        </Tooltip>
      )
    },
  }
)

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
        <EditNotificationRouterModal
          notificationRouter={notificationRouter}
          open={menuKey === MenuItemKey.Edit}
          onClose={() => setMenuKey('')}
        />
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

export const columns = [ColName, ColFilters, ColSinks, ColActions]
