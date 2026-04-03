import { ReactNode } from 'react'
import styled from 'styled-components'

export function WorkbenchTriggerCardIcon({
  children,
}: {
  children: ReactNode
}) {
  return <WrapperSC>{children}</WrapperSC>
}

const WrapperSC = styled.div(({ theme }) => ({
  width: 36,
  height: 36,
  minWidth: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  border: theme.borders.input,
}))
