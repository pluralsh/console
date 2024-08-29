import { useTheme } from 'styled-components'
import React from 'react'

import { Button } from '@pluralsh/design-system'

import { AppNotificationFragment } from '../../generated/graphql'

export default function Notification({
  notification,
}: {
  notification: AppNotificationFragment
}) {
  const theme = useTheme()
  const [expand, setExpand] = React.useState<boolean>(false)

  return (
    <div
      css={{
        backgroundColor: notification.readAt
          ? theme.colors['fill-one']
          : theme.colors['fill-two'],
        padding: `${theme.spacing.large}px ${theme.spacing.medium}px `,
        width: '100%',
      }}
    >
      <div
        css={{
          ...(expand
            ? {}
            : {
                display: '-webkit-box',
                '-webkit-line-clamp': '2',
                '-webkit-box-orient': 'vertical',
                overflow: 'hidden',
              }),
        }}
      >
        {notification.text}
      </div>
      <Button
        onClick={() => setExpand(!expand)}
        small
        secondary
      >
        Read more
      </Button>
    </div>
  )
}
