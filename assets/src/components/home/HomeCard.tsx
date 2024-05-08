import { Card } from '@pluralsh/design-system'
import { ReactNode } from 'react'
import { Property } from 'csstype'
import { useTheme } from 'styled-components'

export const HOME_CARD_MAX_HEIGHT = '436px'

export function HomeCard({
  children,
  label,
  overflow = 'auto',
}: {
  children: ReactNode
  label?: string
  overflow?: Property.Overflow
}) {
  const theme = useTheme()

  return (
    <div>
      {label && (
        <div
          css={{
            ...theme.partials.text.title2,
            marginBottom: theme.spacing.medium,
          }}
        >
          {label}
        </div>
      )}
      <Card
        css={{
          maxHeight: HOME_CARD_MAX_HEIGHT,
          overflow,
        }}
      >
        {children}
      </Card>
    </div>
  )
}
