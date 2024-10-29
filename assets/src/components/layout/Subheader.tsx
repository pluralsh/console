import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Breadcrumbs,
  Button,
  IconFrame,
} from '@pluralsh/design-system'
import { ChatbotPanel } from 'components/ai/Chatbot.tsx'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import ExplainWithAI from '../ai/ExplainWithAI.tsx'

const SubheaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  backgroundColor:
    theme.mode === 'light' ? theme.colors['fill-one'] : theme.colors?.grey[950],
  borderBottom: theme.borders.default,
  minHeight: 48,
  paddingLeft: theme.spacing.large,
  paddingRight: theme.spacing.large,
  gap: theme.spacing.medium,
}))

const BreadcrumbsContainerSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'left',
  justifyContent: 'left',
  overflow: 'hidden',
  flexGrow: 1,
  '.crumbs': {
    paddingTop: theme.spacing.small,
    paddingBottom: theme.spacing.small,
  },
}))

export default function Subheader() {
  const theme = useTheme()
  const navigate = useNavigate()
  const [aiChatOpen, setAiChatOpen] = useState(false)
  return (
    <SubheaderSC>
      <div css={{ display: 'flex', gap: theme.spacing.small }}>
        <IconFrame
          clickable
          size="small"
          icon={<ArrowLeftIcon />}
          onClick={() => navigate(-1)}
          textValue="Back"
          type="floating"
        />
        <IconFrame
          clickable
          size="small"
          icon={<ArrowRightIcon />}
          onClick={() => navigate(1)}
          textValue="Forward"
          type="floating"
        />
      </div>
      <BreadcrumbsContainerSC>
        <Breadcrumbs className="crumbs" />
      </BreadcrumbsContainerSC>
      <ExplainWithAI />
      <div css={{ position: 'relative' }}>
        <Button
          small
          onClick={() => setAiChatOpen(true)}
        >
          Open AI Chat
        </Button>
        <ChatbotPanel
          open={aiChatOpen}
          onClose={() => setAiChatOpen(false)}
        />
      </div>
    </SubheaderSC>
  )
}
