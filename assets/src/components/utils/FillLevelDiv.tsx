// basically a card without the border, a wrapper to manually set a fill level for components that use it

import {
  FillLevel,
  FillLevelProvider,
  toFillLevel,
} from '@pluralsh/design-system'
import { ComponentProps } from 'react'
import { useTheme } from 'styled-components'

const fillLevelToBackground = {
  0: 'fill-zero',
  1: 'fill-one',
  2: 'fill-two',
  3: 'fill-three',
} as const satisfies Record<FillLevel, string>

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

export { fillLevelToBackground }
