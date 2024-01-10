import { ReactNode, memo } from 'react'
import styled from 'styled-components'

const SecondSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
}))

export const StackedText = memo(
  ({ first, second }: { first: ReactNode; second?: ReactNode }) => (
    <>
      <div>{first}</div>
      {second && <SecondSC>{second}</SecondSC>}
    </>
  )
)
