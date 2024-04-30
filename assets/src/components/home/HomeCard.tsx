import { Card } from '@pluralsh/design-system'
import { Flex, H2 } from 'honorable'
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
    <Flex
      direction="column"
      gap={theme.spacing.medium}
    >
      {label && <H2 title2>{label}</H2>}
      <Card
        css={{
          maxHeight: HOME_CARD_MAX_HEIGHT,
          overflow,
        }}
      >
        {children}
      </Card>
    </Flex>
  )
}
