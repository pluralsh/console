import { ComponentProps, ReactNode, memo } from 'react'
import styled from 'styled-components'

import { TRUNCATE } from '../truncate'

export const StackedTextSC = styled.div<{ $truncate?: boolean }>(
  ({ $truncate }) => ({
    display: 'flex',
    flexDirection: 'column',
    ...($truncate ? TRUNCATE : {}),
  })
)
const FirstSC = styled.div<{ $truncate?: boolean }>(({ theme, $truncate }) => ({
  ...theme.partials.text.body2LooseLineHeight,
  ...($truncate ? TRUNCATE : {}),
}))
const SecondSC = styled.div<{ $truncate?: boolean }>(
  ({ theme, $truncate }) => ({
    ...theme.partials.text.caption,
    color: theme.colors['text-xlight'],
    ...($truncate ? TRUNCATE : {}),
  })
)

export const StackedText = memo(
  ({
    first,
    second,
    truncate,
    ...props
  }: {
    first: ReactNode
    second?: ReactNode
    truncate?: boolean
  } & ComponentProps<typeof StackedTextSC>) => (
    <StackedTextSC
      $truncate={truncate}
      {...props}
    >
      <FirstSC $truncate={truncate}>{first}</FirstSC>
      {second && <SecondSC $truncate={truncate}>{second}</SecondSC>}
    </StackedTextSC>
  )
)
