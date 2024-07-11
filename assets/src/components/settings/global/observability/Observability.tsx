import { useSetBreadcrumbs } from '@pluralsh/design-system'

import styled from 'styled-components'

import { getGlobalSettingsBreadcrumbs } from '../GlobalSettings'

import ObservabilityProviders from './ObservabilityProviders'
import ObservabilitySettings from './ObservabilitySettings'

const breadcrumbs = getGlobalSettingsBreadcrumbs('observability')

export default function Observability() {
  useSetBreadcrumbs(breadcrumbs)

  return (
    <ObservabilityWrapperSC>
      <ObservabilityProviders />
      <ObservabilitySettings />
    </ObservabilityWrapperSC>
  )
}

const ObservabilityWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  overflow: 'auto',
  paddingRight: '8px',
}))
