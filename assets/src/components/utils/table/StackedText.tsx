import { ComponentProps, ReactNode, memo } from 'react'
import styled from 'styled-components'

const StackedTextSC = styled.div((_) => ({
  display: 'flex',
  flexDirection: 'column',
}))
const FirstSC = styled.div(({ theme }) => ({
  ...theme.partials.text.body2,
}))
const SecondSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
}))

export const StackedText = memo(
  ({
    first,
    second,
    ...props
  }: { first: ReactNode; second?: ReactNode } & ComponentProps<
    typeof StackedTextSC
  >) => (
    <StackedTextSC {...props}>
      <FirstSC>{first}</FirstSC>
      {second && <SecondSC>{second}</SecondSC>}
    </StackedTextSC>
  )
)
