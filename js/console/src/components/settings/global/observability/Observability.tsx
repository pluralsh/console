import styled from 'styled-components'

import { Outlet, useOutletContext } from 'react-router-dom'

export default function Observability() {
  const curContext = useOutletContext()

  return (
    <ObservabilityWrapperSC>
      <Outlet context={curContext} />
    </ObservabilityWrapperSC>
  )
}

const ObservabilityWrapperSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  overflow: 'auto',
  paddingRight: '8px',
})
