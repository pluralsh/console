import { Flex } from 'honorable'
import { LightDarkSwitch, setThemeColorMode } from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'
import { useNavigate } from 'react-router-dom'

import BillingSubscriptionChip from 'components/billing/BillingSubscriptionChip'
import BillingLegacyUserMessage from 'components/billing/BillingLegacyUserMessage'
import CommandPaletteLauncher from 'components/CommandPaletteLauncher'

import DemoBanner from './DemoBanner'

const APP_ICON_LIGHT = '/header-logo-light.png'
const APP_ICON_DARK = '/header-logo-dark.png'

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
  marginLeft: -2.0 /* Optically center with sidebar buttons */,
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
        <Flex grow={1} />
        <BillingLegacyUserMessage />
        <BillingSubscriptionChip />
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
