import { useTheme } from 'styled-components'
import { ComponentProps } from 'react'
import {
  Button,
  Card,
  CloseIcon,
  GearTrainIcon,
  IconFrame,
  Toast,
} from '@pluralsh/design-system'
import { useNavigate } from 'react-router-dom'

import { NOTIFICATIONS_ABS_PATH } from '../../routes/settingsRoutesConst'
import { useReadAppNotificationsMutation } from '../../generated/graphql'

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
        content
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
