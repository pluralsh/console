import { ComponentProps, ReactNode, memo } from 'react'
import styled, { DefaultTheme } from 'styled-components'

import { TRUNCATE } from '../truncate'
import { SemanticColorKey } from '@pluralsh/design-system'

type PartialType = keyof DefaultTheme['partials']['text']

export const StackedTextSC = styled.div<{ $truncate?: boolean }>(
  ({ $truncate }) => ({
    display: 'flex',
    flexDirection: 'column',
    ...($truncate ? TRUNCATE : {}),
  })
)
const FirstSC = styled.div<{
  $truncate?: boolean
  $partialType?: PartialType
  $color?: SemanticColorKey
}>(
  ({
    theme,
    $truncate,
    $partialType = 'body2LooseLineHeight',
    $color = 'text-light',
  }) => ({
    ...theme.partials.text[$partialType],
    ...($truncate ? TRUNCATE : {}),
    color: theme.colors[$color],
  })
)
const SecondSC = styled.div<{
  $truncate?: boolean
  $partialType?: PartialType
  $color?: string
}>(({ theme, $truncate, $partialType = 'caption', $color }) => ({
  ...theme.partials.text[$partialType],
  color: $color || theme.colors['text-xlight'],
  ...($truncate ? TRUNCATE : {}),
}))

export const StackedText = memo(
  ({
    first,
    second,
    truncate,
    firstPartialType,
    secondPartialType,
    firstColor,
    secondColor,
    ...props
  }: {
    first: ReactNode
    second?: ReactNode
    truncate?: boolean
    firstPartialType?: PartialType
    secondPartialType?: PartialType
    firstColor?: SemanticColorKey
    secondColor?: SemanticColorKey
  } & ComponentProps<typeof StackedTextSC>) => (
    <StackedTextSC
      $truncate={truncate}
      {...props}
    >
      <FirstSC
        $partialType={firstPartialType}
        $truncate={truncate}
        $color={firstColor}
      >
        {first}
      </FirstSC>
      {second && (
        <SecondSC
          $truncate={truncate}
          $partialType={secondPartialType}
          $color={secondColor}
        >
          {second}
        </SecondSC>
      )}
    </StackedTextSC>
  )
)
