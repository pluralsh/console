import {
  Flex,
  LightDarkSwitch,
  setThemeColorMode,
} from '@pluralsh/design-system'
import { useNavigate } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'

import BillingLegacyUserMessage from 'components/billing/BillingLegacyUserMessage'
import BillingSubscriptionChip from 'components/billing/BillingSubscriptionChip'

import NotificationsLauncher from '../notifications/NotificationsLauncher'

import { Chatbot } from 'components/ai/chatbot/Chatbot'
import DemoBanner from './DemoBanner'
import ProjectSelect from './HeaderProjectSelect'

const APP_ICON_LIGHT = '/plural-logo.png'
const APP_ICON_DARK = '/plural-logo-white.png'

const HeaderSC = styled.div(({ theme }) => ({
  backgroundColor: theme.colors['fill-accent'],
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
        <LightDarkSwitch
          checked={theme.mode === 'dark'}
          onChange={(val) => {
            setThemeColorMode(val ? 'dark' : 'light')
          }}
        />
        <Chatbot />
      </HeaderContentSC>
    </HeaderSC>
  )
}
