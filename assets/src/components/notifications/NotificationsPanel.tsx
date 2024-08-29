import { useTheme } from 'styled-components'
import React, { ComponentProps } from 'react'
import {
  Button,
  Card,
  CloseIcon,
  GearTrainIcon,
  IconFrame,
  Table,
  Toast,
} from '@pluralsh/design-system'
import { useNavigate } from 'react-router-dom'
import { createColumnHelper } from '@tanstack/react-table'

import { isEmpty } from 'lodash'

import { NOTIFICATIONS_ABS_PATH } from '../../routes/settingsRoutesConst'
import {
  AppNotificationFragment,
  NotificationPriority,
  useAppNotificationsQuery,
  useReadAppNotificationsMutation,
} from '../../generated/graphql'
import { useFetchPaginatedData } from '../cd/utils/useFetchPaginatedData'

const NOTIFICATIONS_QUERY_PAGE_SIZE = 100

const columnHelper = createColumnHelper<AppNotificationFragment>()

const columns = [
  columnHelper.accessor((notification) => notification, {
    id: 'notification',
    cell: function Cell({ getValue }) {
      const notification = getValue()

      return notification.text
    },
  }),
]

export function NotificationsPanel({
  onClose,
  refetchUnreadNotificationsCount,
  ...props
}: ComponentProps<typeof Card> & {
  onClose: () => void
  refetchUnreadNotificationsCount: () => void
}) {
  const theme = useTheme()
  const navigate = useNavigate()

  const { data: _ } = useFetchPaginatedData({
    queryHook: useAppNotificationsQuery,
    pageSize: NOTIFICATIONS_QUERY_PAGE_SIZE,
    keyPath: ['appNotifications'],
  })

  // const notifications = useMemo(
  //   () => mapExistingNodes(data?.appNotifications),
  //   [data?.appNotifications]
  // )

  const notifications: AppNotificationFragment[] = [
    {
      id: '0',
      text: 'Example notification',
      priority: NotificationPriority.Medium,
    },
    {
      id: '0',
      text: 'Example notification',
      priority: NotificationPriority.Medium,
    },
    {
      id: '0',
      text: 'Example notification',
      priority: NotificationPriority.Medium,
    },
  ]

  const [mutation, { loading, error }] = useReadAppNotificationsMutation({
    onCompleted: () => refetchUnreadNotificationsCount(),
  })

  return (
    <>
      <Card
        fillLevel={1}
        css={{ border: theme.borders.input, flexGrow: 1 }}
        {...props}
      >
        <div
          css={{
            alignItems: 'center',
            borderBottom: theme.borders.input,
            display: 'flex',
            flexGrow: 1,
            gap: theme.spacing.small,
            height: 64,
            padding: theme.spacing.medium,
          }}
        >
          <span
            css={{
              ...theme.partials.text.overline,
              color: theme.colors['text-xlight'],
              flexGrow: 1,
            }}
          >
            Notifications
          </span>
          <IconFrame
            clickable
            icon={<GearTrainIcon />}
            onClick={() => {
              navigate(NOTIFICATIONS_ABS_PATH)
              onClose()
            }}
            tooltip="Go to notifications settings"
            type="secondary"
          />
          <Button
            loading={loading}
            onClick={mutation}
            small
            secondary
          >
            Mark all as read
          </Button>
          <IconFrame
            clickable
            icon={<CloseIcon />}
            onClick={onClose}
            tooltip="Close"
          />
        </div>
        {isEmpty(notifications) ? (
          <div
            css={{
              color: theme.colors['text-light'],
              padding: theme.spacing.medium,
            }}
          >
            You do not have any notifications yet.
          </div>
        ) : (
          <Table
            columns={columns}
            data={notifications}
            rowBg="raised"
            loose
            hideHeader
            css={{
              border: 'none',
              borderRadius: 0,
              height: '100%',
            }}
          />
        )}
      </Card>
      {error && (
        <Toast
          heading="Failed to mark notifications as read"
          severity="danger"
          margin="medium"
          closeTimeout={3000}
        >
          {error.message}
        </Toast>
      )}
    </>
  )
}
