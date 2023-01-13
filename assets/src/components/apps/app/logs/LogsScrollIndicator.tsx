import { Button, CaretUpIcon } from '@pluralsh/design-system'
import styled from 'styled-components'

export const LiveIcon = styled.div(({ theme }) => ({
  backgroundColor: theme.colors['text-success'],
  borderRadius: 10,
  height: 10,
  width: 10,
}))

export default function LogsScrollIndicator({ live, returnToTop }) {
  return (
    <Button
      small
      position="absolute"
      bottom={24}
      right={24}
      floating
      cursor={live ? 'auto' : undefined}
      endIcon={live ? <LiveIcon /> : <CaretUpIcon />}
      onClick={returnToTop}
    >
      {live ? 'Live' : 'Back to top'}
    </Button>

  )
}
