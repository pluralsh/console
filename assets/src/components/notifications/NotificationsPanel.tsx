import { useTheme } from 'styled-components'
import { ComponentProps, useState } from 'react'
import {
  Banner,
  Button,
  Card,
  CloseIcon,
  GearTrainIcon,
  IconFrame,
} from '@pluralsh/design-system'
import { useNavigate } from 'react-router-dom'
import { ApolloError } from 'apollo-boost'

import { NOTIFICATIONS_ABS_PATH } from '../../routes/settingsRoutesConst'
import { useReadAppNotificationsMutation } from '../../generated/graphql'

export function NotificationsPanel({
  onClose,
  ...props
}: ComponentProps<typeof Card> & { onClose: () => void }) {
  const theme = useTheme()
  const navigate = useNavigate()
  const [error, setError] = useState<ApolloError>()

  const [mutation, { loading }] = useReadAppNotificationsMutation({
    onError: (error) => {
      setError(error)
      setTimeout(() => setError(undefined), 3000)
    },
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
        <Banner
          heading="Failed to mark notifications as read"
          severity="error"
          position="fixed"
          bottom={24}
          right={100}
          zIndex={theme.zIndexes.modal}
          onClose={() => setError(undefined)}
        >
          {error.message}
        </Banner>
      )}
    </>
  )
}
