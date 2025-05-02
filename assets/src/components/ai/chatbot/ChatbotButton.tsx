import {
  ArrowTopRightIcon,
  Button,
  ChatOutlineIcon,
  IconFrame,
  Spinner,
} from '@pluralsh/design-system'
import { AiInsightFragment, AiRole, ChatMessage } from 'generated/graphql.ts'
import { ComponentPropsWithRef, Dispatch, ReactNode } from 'react'
import { useChatbot } from '../AIContext.tsx'
import AIButton from '../explain/ExplainWithAIButton.tsx'
import { useAIEnabled } from 'components/contexts/DeploymentSettingsContext.tsx'
import { Link } from 'react-router-dom'
import { AI_ABS_PATH } from 'routes/aiRoutesConsts.tsx'

const FIX_PREFACE =
  "The following is an insight into an issue on the user's infrastructure we'd like to learn more about:"

interface ChatbotButtonProps {
  active: boolean
  onClick: Dispatch<void>
}

export function ChatbotIconButton({
  onClick,
  active,
  ...props
}: ChatbotButtonProps & ComponentPropsWithRef<typeof Button>): ReactNode {
  return (
    <AIButton
      onClick={onClick}
      active={active}
      visible={true}
      startIcon={<ChatOutlineIcon size={12} />}
      {...props}
    >
      Chat with AI
    </AIButton>
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
  iconOnly = false,
  ...props
}: {
  messages?: Nullable<ChatMessage[]>
  insightId?: Nullable<string>
  flowId?: Nullable<string>
  summaryText?: string
  bodyText?: string
  iconOnly?: boolean
} & ComponentPropsWithRef<typeof Button>) {
  const {
    createNewThread,
    mutationLoading: loading,
    closeChatbot,
  } = useChatbot()
  const aiEnabled = useAIEnabled()
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
  return iconOnly ? (
    <IconFrame
      clickable
      {...(aiEnabled
        ? {
            onClick: handleClick,
            icon: loading ? <Spinner /> : <ChatOutlineIcon />,
            to: '',
          }
        : {
            as: Link,
            to: AI_ABS_PATH,
            onClick: closeChatbot,
            icon: <ArrowTopRightIcon />,
          })}
      tooltip
      textValue={bodyText}
      type="secondary"
      {...props}
    />
  ) : (
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
