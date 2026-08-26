import {
  ArrowTopRightIcon,
  Button,
  ButtonProps,
  ChatOutlineIcon,
} from '@pluralsh/design-system'
import { useAIEnabled } from 'components/contexts/DeploymentSettingsContext.tsx'
import {
  borderShimmerStyles,
  useBorderShimmer,
} from 'components/utils/borderShimmer'
import { useWorkbenchOptions } from 'components/workbenches/useWorkbenchOptions.ts'
import { AiInsightFragment, AiRole, ChatMessage } from 'generated/graphql.ts'
import { ComponentPropsWithRef } from 'react'
import { Link } from 'react-router-dom'
import { AI_ABS_PATH } from 'routes/aiRoutesConsts.tsx'
import styled from 'styled-components'
import { useChatbot } from '../AIContext.tsx'

const FIX_PREFACE =
  "The following is an insight into an issue on the user's infrastructure we'd like to learn more about:"

export function MainChatbotButton({
  ...props
}: ComponentPropsWithRef<typeof Button>) {
  const showAnimation = useBorderShimmer()
  return (
    <MainChatbotButtonSC
      $showAnimation={showAnimation}
      small
      secondary
      startIcon={<ChatOutlineIcon size={12} />}
      {...props}
    >
      Chat
    </MainChatbotButtonSC>
  )
}

export function insightMessage(
  insight: Nullable<AiInsightFragment>
): ChatMessage {
  return {
    content: `${FIX_PREFACE}\n\n${insight?.text ?? ''}`,
    role: AiRole.Assistant,
  }
}

export function ChatWithAIButton({
  messages,
  insightId,
  flowId,
  summaryText = 'Further questions about an insight from Plural AI',
  bodyText: bodyTextProp = 'Chat with AI',
  alwaysShow = false,
  ...props
}: {
  messages?: Nullable<ChatMessage[]>
  insightId?: Nullable<string>
  flowId?: Nullable<string>
  summaryText?: string
  bodyText?: string
  alwaysShow?: boolean
} & ButtonProps) {
  const {
    createNewThread,
    mutationLoading: loading,
    closeChatbot,
  } = useChatbot()
  const aiEnabled = useAIEnabled()
  const { confirmedNoWorkbenches } = useWorkbenchOptions()
  const bodyText = aiEnabled ? bodyTextProp : 'Enable AI to chat'

  const handleClick = () => {
    createNewThread({
      insightId,
      flowId,
      summary: summaryText,
      summarized: false,
      messages: messages || [],
    })
  }

  if (!confirmedNoWorkbenches) return null
  if (!alwaysShow && !insightId && !flowId) return null

  return (
    <Button
      loading={loading}
      {...(aiEnabled
        ? { onClick: handleClick, startIcon: <ChatOutlineIcon /> }
        : {
            as: Link,
            to: AI_ABS_PATH,
            onClick: closeChatbot,
            endIcon: <ArrowTopRightIcon />,
          })}
      {...props}
    >
      {bodyText}
    </Button>
  )
}

const MainChatbotButtonSC = styled(Button)<{ $showAnimation: boolean }>(
  ({ theme, $showAnimation }) =>
    borderShimmerStyles({
      theme,
      showAnimation: $showAnimation,
      fillColor: theme.colors['fill-accent'],
    })
)
