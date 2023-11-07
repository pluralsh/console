import { Div, Flex, Img } from 'honorable'
import { theme } from '@pluralsh/design-system'
import { useNavigate } from 'react-router-dom'

import BillingSubscriptionChip from 'components/billing/BillingSubscriptionChip'

import BillingLegacyUserMessage from 'components/billing/BillingLegacyUserMessage'

import CommandPaletteLauncher from 'components/CommandPaletteLauncher'

import { LoginContext } from 'components/contexts'

import { useContext } from 'react'

import { InstallerModal } from '../repos/installer/Modal'

import DemoBanner from './DemoBanner'

const APP_ICON = '/console-logo-white.png'

export default function Header() {
  const { configuration } = useContext<any>(LoginContext)
  const navigate = useNavigate()

  return (
    <Div
      backgroundColor={theme.colors?.grey[950]}
      borderBottom="1px solid border"
    >
      <DemoBanner />
      <Flex
        align="center"
        gap="medium"
        paddingHorizontal="large"
        paddingVertical="xsmall"
      >
        <Img
          cursor="pointer"
          height={32}
          marginVertical={4}
          src={APP_ICON}
          alt="Plural console"
          marginLeft={-2.0} /* Optically center with sidebar buttons */
          onClick={() => navigate('/')}
        />
        <Flex grow={1} />
        <BillingLegacyUserMessage />
        <BillingSubscriptionChip />
        <CommandPaletteLauncher />
        {!configuration.byok && <InstallerModal />}
      </Flex>
    </Div>
  )
}
