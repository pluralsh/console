import { useTheme } from 'styled-components'
import { ComponentProps, useMemo } from 'react'
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
import isEmpty from 'lodash/isEmpty'

import { NOTIFICATIONS_ABS_PATH } from '../../routes/settingsRoutesConst'
import {
  AppNotificationFragment,
  useAppNotificationsQuery,
  useReadAppNotificationsMutation,
} from '../../generated/graphql'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from '../utils/table/useFetchPaginatedData'
import { mapExistingNodes } from '../../utils/graphql'

import Notification from './Notification'

const columnHelper = createColumnHelper<AppNotificationFragment>()

const columns = [
  columnHelper.accessor((notification) => notification, {
    id: 'notification',
    cell: ({ getValue }) => <Notification notification={getValue()} />,
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

  const { data, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData({
      queryHook: useAppNotificationsQuery,
      keyPath: ['appNotifications'],
    })

  const notifications = useMemo(
    () => mapExistingNodes(data?.appNotifications),
    [data?.appNotifications]
  )

  const [mutation, { loading, error }] = useReadAppNotificationsMutation({
    onCompleted: () => refetchUnreadNotificationsCount(),
  })

  return (
    <>
      <Card
        fillLevel={1}
        css={{ border: theme.borders.input, flexGrow: 1, overflow: 'hidden' }}
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
            reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
            virtualizeRows
            hasNextPage={pageInfo?.hasNextPage}
            fetchNextPage={fetchNextPage}
            isFetchingNextPage={loading}
            onVirtualSliceChange={setVirtualSlice}
            hideHeader
            css={{
              border: 'none',
              borderRadius: 0,
              height: '100%',
              maxHeight: 574,
              td: { padding: 0 },
              'tr:not(:first-child) td': { borderTop: theme.borders.input },
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
