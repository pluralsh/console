import { useTheme } from 'styled-components'
import { ComponentProps } from 'react'
import { Card } from '@pluralsh/design-system'

export function NotificationsPanel({ ...props }: ComponentProps<typeof Card>) {
  const theme = useTheme()

  return (
    <Card
      fillLevel={2}
      css={{ flexGrow: 1 }}
      {...props}
    >
      <div css={{ flexGrow: 1, height: 64 }}>header</div>
      content
    </Card>
  )
}
