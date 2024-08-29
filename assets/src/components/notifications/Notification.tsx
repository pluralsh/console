import { useTheme } from 'styled-components'
import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@pluralsh/design-system'
import moment from 'moment/moment'

import { AppNotificationFragment } from '../../generated/graphql'

export default function Notification({
  notification,
}: {
  notification: AppNotificationFragment
}) {
  const theme = useTheme()
  const contentRef = useRef<HTMLDivElement>(null)
  const [expand, setExpand] = useState<boolean>(false)
  const [clamped, setClamped] = useState<boolean>(false)

  useEffect(() => {
    function handleResize() {
      if (contentRef && contentRef.current) {
        setClamped(
          contentRef.current.scrollHeight > contentRef.current.clientHeight
        )
      }
    }

    window.addEventListener('resize', handleResize)

    handleResize()

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div
      css={{
        backgroundColor: notification.readAt
          ? theme.colors['fill-one']
          : theme.colors['fill-two'],
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        padding: `${theme.spacing.large}px ${theme.spacing.medium}px `,
        width: '100%',
      }}
    >
      <div
        css={{
          ...theme.partials.text.caption,
          color: theme.colors['text-xlight'],
        }}
      >
        {moment(notification.insertedAt).format('MMM D, YYYY h:mm a')}
      </div>
      <div
        ref={contentRef}
        css={{
          ...(expand
            ? {}
            : {
                display: '-webkit-box',
                overflow: 'hidden',
                '-webkit-line-clamp': '2',
                '-webkit-box-orient': 'vertical',
              }),
        }}
      >
        {notification.text}
      </div>
      {clamped && (
        <Button
          onClick={() => setExpand(!expand)}
          marginTop="small"
          small
          secondary
          width="fit-content"
        >
          Read {expand ? 'less' : 'more'}
        </Button>
      )}
    </div>
  )
}
