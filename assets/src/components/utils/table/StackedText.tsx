import { ComponentProps, ReactNode, memo } from 'react'
import styled, { DefaultTheme } from 'styled-components'

import { TRUNCATE } from '../truncate'

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
}>(({ theme, $truncate, $partialType = 'body2LooseLineHeight' }) => ({
  ...theme.partials.text[$partialType],
  ...($truncate ? TRUNCATE : {}),
}))
const SecondSC = styled.div<{
  $truncate?: boolean
  $partialType?: PartialType
}>(({ theme, $truncate, $partialType = 'caption' }) => ({
  ...theme.partials.text[$partialType],
  color: theme.colors['text-xlight'],
  ...($truncate ? TRUNCATE : {}),
}))

export const StackedText = memo(
  ({
    first,
    second,
    truncate,
    firstPartialType,
    secondPartialType,
    ...props
  }: {
    first: ReactNode
    second?: ReactNode
    truncate?: boolean
    firstPartialType?: PartialType
    secondPartialType?: PartialType
  } & ComponentProps<typeof StackedTextSC>) => (
    <StackedTextSC
      $truncate={truncate}
      {...props}
    >
      <FirstSC
        $partialType={firstPartialType}
        $truncate={truncate}
      >
        {first}
      </FirstSC>
      {second && <SecondSC $partialType={secondPartialType}>{second}</SecondSC>}
    </StackedTextSC>
  )
)
