import { useTheme } from 'styled-components'
import React from 'react'

import { AppNotificationFragment } from '../../generated/graphql'

export default function Notification({
  notification,
}: {
  notification: AppNotificationFragment
}) {
  const theme = useTheme()

  return (
    <div
      css={{
        backgroundColor: notification.readAt
          ? theme.colors['fill-one']
          : theme.colors['fill-two'],
        height: '100%',
        padding: `${theme.spacing.large}px ${theme.spacing.medium}px `,
        width: '100%',
      }}
    >
      {notification.text}
    </div>
  )
}
