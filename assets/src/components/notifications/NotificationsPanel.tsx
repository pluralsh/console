import { useTheme } from 'styled-components'
import { ComponentProps } from 'react'
import {
  Button,
  Card,
  CloseIcon,
  GearTrainIcon,
  IconFrame,
} from '@pluralsh/design-system'

export function NotificationsPanel({
  onClose,
  ...props
}: ComponentProps<typeof Card> & { onClose?: () => void }) {
  const theme = useTheme()

  return (
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
          onClick={onClose}
          type="secondary"
        />
        <Button
          small
          secondary
        >
          Mark all as read
        </Button>
        <IconFrame
          clickable
          icon={<CloseIcon />}
          onClick={onClose}
        />
      </div>
      content
    </Card>
  )
}
