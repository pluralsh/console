import { type ComponentProps } from 'react'
import styled from 'styled-components'

export const TruncateEnd = styled.div((_) => ({
  width: '100%',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}))

const TruncateStartSC = styled(TruncateEnd)((_) => ({
  direction: 'rtl',
  textAlign: 'left',
  // Force LTR inside the RTL truncation box. Without this, punctuation in
  // URLs (especially a trailing /) is reordered to the visual start.
  '& > [data-truncate-start-text]': {
    direction: 'ltr',
    unicodeBidi: 'bidi-override',
  },
}))

export function TruncateStart({
  children,
  ...props
}: ComponentProps<typeof TruncateStartSC>) {
  return (
    <TruncateStartSC {...props}>
      <span data-truncate-start-text="">{children}</span>
    </TruncateStartSC>
  )
}
