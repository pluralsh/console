import styled from 'styled-components'

import { SettingsPageHeader } from 'components/settings/Settings'
import { SubTabs } from 'components/utils/SubTabs'
import { Outlet, useOutletContext } from 'react-router-dom'

const directory = [
  { path: 'providers', label: 'Providers' },
  { path: 'webhooks', label: 'Webhooks' },
]

export default function Observability() {
  const curContext = useOutletContext()

  return (
    <ObservabilityWrapperSC>
      <SettingsPageHeader heading="Observability">
        <SubTabs directory={directory} />
      </SettingsPageHeader>
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
