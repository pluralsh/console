import {
  Flex,
  LightDarkSwitch,
  setThemeColorMode,
} from '@pluralsh/design-system'
import { useNavigate } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'

import BillingLegacyUserMessage from 'components/billing/BillingLegacyUserMessage'
import BillingSubscriptionChip from 'components/billing/BillingSubscriptionChip'
import CommandPaletteLauncher from 'components/commandpalette/CommandPaletteLauncher'

import NotificationsLauncher from '../notifications/NotificationsLauncher'

import DemoBanner from './DemoBanner'
import ProjectSelect from './HeaderProjectSelect'

const APP_ICON_LIGHT = '/console-logo.png'
const APP_ICON_DARK = '/console-white.png'

const HeaderSC = styled.div(({ theme }) => ({
  backgroundColor:
    theme.mode === 'light' ? theme.colors['fill-one'] : theme.colors.grey[950],
  borderBottom: theme.borders.default,
}))

const HeaderContentSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.medium,
  padding: `${theme.spacing.xsmall}px ${theme.spacing.large}px`,
}))

const LogoSC = styled.img(({ theme }) => ({
  cursor: 'pointer',
  marginLeft: -7 /* Optically center with sidebar buttons */,
  height: 32,
  marginTop: theme.spacing.xxsmall,
  marginBottom: theme.spacing.xxsmall,
}))

export default function Header() {
  const navigate = useNavigate()
  const theme = useTheme()

  return (
    <HeaderSC>
      <DemoBanner />
      <HeaderContentSC>
        <LogoSC
          src={theme.mode === 'light' ? APP_ICON_LIGHT : APP_ICON_DARK}
          alt="Plural console"
          onClick={() => navigate('/')}
        />
        <ProjectSelect />
        <Flex grow={1} />
        <BillingLegacyUserMessage />
        <BillingSubscriptionChip />
        <NotificationsLauncher />
        <CommandPaletteLauncher />
        <LightDarkSwitch
          checked={theme.mode === 'dark'}
          onChange={(val) => {
            setThemeColorMode(val ? 'dark' : 'light')
          }}
        />
      </HeaderContentSC>
    </HeaderSC>
  )
}
