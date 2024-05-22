import { Card } from '@pluralsh/design-system'
import { ReactNode } from 'react'
import { Property } from 'csstype'
import { useTheme } from 'styled-components'

import { Title2H1 } from '../utils/typography/Text'

export const HOME_CARD_MAX_HEIGHT = '436px'

export function HomeCard({
  children,
  label,
  overflow = 'auto hidden',
}: {
  children: ReactNode
  label?: string
  overflow?: Property.Overflow
}) {
  const theme = useTheme()

  return (
    <div css={{ gap: theme.spacing.medium }}>
      {label && <Title2H1>{label}</Title2H1>}
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
