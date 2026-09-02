import styled from 'styled-components'

import { SettingsPageHeader } from 'components/settings/Settings'
import { Outlet, useOutletContext } from 'react-router-dom'

export default function Observability() {
  const curContext = useOutletContext()

  return (
    <ObservabilityWrapperSC>
      <SettingsPageHeader heading="Observability" />
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
