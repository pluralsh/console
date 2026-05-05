import { Flex } from '@pluralsh/design-system'
import styled from 'styled-components'

import BillingLegacyUserMessage from 'components/billing/BillingLegacyUserMessage'

import NotificationsLauncher from '../notifications/NotificationsLauncher'

import { ChatbotLauncher } from 'components/ai/chatbot/Chatbot'
import DemoBanner from './DemoBanner'
import { HeaderProjectSelect } from './HeaderProjectSelect'
import { ProfileMenu } from './ProfileMenu'

const HeaderSC = styled.div(({ theme }) => ({
  backgroundColor: theme.colors['fill-accent'],
  borderBottom: theme.borders.default,
}))

const HeaderContentSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  padding: `${theme.spacing.xsmall}px ${theme.spacing.large}px`,
}))

export default function Header() {
  return (
    <HeaderSC>
      <DemoBanner />
      <HeaderContentSC>
        <HeaderProjectSelect />
        <Flex grow={1} />
        <BillingLegacyUserMessage />
        <ChatbotLauncher />
        <NotificationsLauncher />
        <ProfileMenu />
      </HeaderContentSC>
    </HeaderSC>
  )
}
