import { Breadcrumbs, Chip, Flex, ReturnIcon } from '@pluralsh/design-system'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import BillingLegacyUserMessage from 'components/billing/BillingLegacyUserMessage'
import { CommandPaletteLauncher } from 'components/commandpalette/CommandPaletteLauncher'

import AwaitingReviewLauncher from '../awaiting-review/AwaitingReviewLauncher'
import NotificationsLauncher from '../notifications/NotificationsLauncher'

import ExplainWithAI from 'components/ai/explain/ExplainWithAI'
import { ChatbotLauncher } from 'components/ai/chatbot/Chatbot'
import DemoBanner from './DemoBanner'
import { HeaderProjectSelect } from './HeaderProjectSelect'
import { HeaderWorkbenchSelect } from './HeaderWorkbenchSelect'
import { HEADER_HEIGHT } from './layoutConsts'
import { ProfileMenu } from './ProfileMenu'
import { useSubheaderBackButton } from './useSubheaderBackButton'

const HeaderSC = styled.div(({ theme }) => ({
  backgroundColor: theme.colors['fill-accent'],
  borderBottom: theme.borders.hairline,
}))

const HeaderContentSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  height: HEADER_HEIGHT,
  padding: `0 ${theme.spacing.medium}px`,
}))

export default function Header() {
  const backButton = useSubheaderBackButton()

  return (
    <HeaderSC>
      <DemoBanner />
      <HeaderContentSC>
        {backButton && (
          <BackLinkSC to={backButton.to}>
            <Chip
              clickable
              size="small"
              fillLevel={2}
              icon={<ReturnIcon size={12} />}
            >
              <Flex
                align="center"
                gap="xsmall"
              >
                {backButton.icon}
                {backButton.label}
              </Flex>
            </Chip>
          </BackLinkSC>
        )}
        <CrumbsSC>
          <HeaderProjectSelect />
          <CrumbSeparatorSC aria-hidden>/</CrumbSeparatorSC>
          <Breadcrumbs className="crumbs" />
        </CrumbsSC>
        <Flex
          align="center"
          gap="small"
          flexShrink={0}
        >
          <ExplainWithAI />
          <CommandPaletteLauncher />
          <BillingLegacyUserMessage />
          <AwaitingReviewLauncher />
          <NotificationsLauncher />
          <HeaderWorkbenchSelect />
          <ChatbotLauncher />
          <ProfileMenu />
        </Flex>
      </HeaderContentSC>
    </HeaderSC>
  )
}

const CrumbsSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  '.crumbs': { flex: 1, minWidth: 0 },
}))

const CrumbSeparatorSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-input-disabled'],
}))

const BackLinkSC = styled(Link)({
  display: 'inline-flex',
  flexShrink: 0,
  textDecoration: 'none',
})
