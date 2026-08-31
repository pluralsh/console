// basically a card without the border, a wrapper to manually set a fill level for components that use it

import {
  FillLevel,
  FillLevelProvider,
  SemanticColorKey,
  toFillLevel,
} from '@pluralsh/design-system'
import { ComponentProps } from 'react'
import { useTheme } from 'styled-components'

export const fillLevelToBackground = {
  0: 'fill-zero',
  1: 'fill-one',
  2: 'fill-two',
  3: 'fill-three',
} as const satisfies Record<FillLevel, string>

export const fillLevelToBorderColor: Record<FillLevel, SemanticColorKey> = {
  0: 'border',
  1: 'border-fill-one',
  2: 'border-fill-two',
  3: 'border-fill-three',
}

export function FillLevelDiv({
  fillLevel,
  children,
  ...props
}: {
  fillLevel: FillLevel
} & ComponentProps<'div'>) {
  const theme = useTheme()
  const backgroundName = fillLevelToBackground[toFillLevel(fillLevel)]

  return (
    <FillLevelProvider value={fillLevel}>
      <div
        css={{ background: theme.colors[backgroundName] }}
        {...props}
      >
        {children}
      </div>
    </FillLevelProvider>
  )
}
