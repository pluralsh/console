import { useTheme } from 'styled-components'
import { ComponentProps, useMemo } from 'react'
import {
  BellIcon,
  Button,
  Card,
  CloseIcon,
  Flex,
  GearTrainIcon,
  IconFrame,
  Table,
  Toast,
} from '@pluralsh/design-system'
import { Overline } from 'components/cd/utils/PermissionsModal'
import { useNavigate } from 'react-router-dom'
import { createColumnHelper } from '@tanstack/react-table'
import isEmpty from 'lodash/isEmpty'

import { NOTIFICATIONS_ABS_PATH } from '../../routes/settingsRoutesConst'
import {
  AppNotificationFragment,
  useAppNotificationsQuery,
  useReadAppNotificationsMutation,
} from '../../generated/graphql'
import { useFetchPaginatedData } from '../utils/table/useFetchPaginatedData'
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
        css={{
          display: 'flex',
          flexDirection: 'column',
          border: theme.borders.input,
          minHeight: 0,
          width: 480,
        }}
        {...props}
      >
        <Flex
          align="center"
          gap="xsmall"
          padding="xsmall"
          borderBottom={theme.borders.input}
        >
          <IconFrame icon={<BellIcon color="icon-xlight" />} />
          <Overline css={{ flexGrow: 1 }}>Notifications</Overline>
          <IconFrame
            clickable
            size="medium"
            icon={<GearTrainIcon color="icon-light" />}
            onClick={() => {
              navigate(NOTIFICATIONS_ABS_PATH)
              onClose()
            }}
            tooltip="Go to notifications settings"
          />
          <Button
            loading={loading}
            onClick={() => mutation()}
            small
            secondary
          >
            Mark all as read
          </Button>
          <IconFrame
            clickable
            size="medium"
            icon={<CloseIcon color="icon-light" />}
            onClick={onClose}
            tooltip="Close"
          />
        </Flex>
        {isEmpty(notifications) ? (
          <div
            css={{
              color: theme.colors['text-light'],
              padding: theme.spacing.medium,
              height: 240,
            }}
          >
            You do not have any notifications yet.
          </div>
        ) : (
          <Table
            flush
            hideHeader
            fillLevel={1}
            fullHeightWrap
            padCells={false}
            rowBg="base"
            columns={columns}
            data={notifications}
            virtualizeRows
            hasNextPage={pageInfo?.hasNextPage}
            fetchNextPage={fetchNextPage}
            isFetchingNextPage={loading}
            onVirtualSliceChange={setVirtualSlice}
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
