import {
  Button,
  ChatOutlineIcon,
  IconFrame,
  Spinner,
} from '@pluralsh/design-system'
import { AiInsightFragment, AiRole, ChatMessage } from 'generated/graphql.ts'
import { ButtonProps } from 'honorable'
import { Dispatch, ReactNode } from 'react'
import { useChatbot } from '../AIContext.tsx'
import AIButton from '../explain/ExplainWithAIButton.tsx'

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
}: ChatbotButtonProps & ButtonProps): ReactNode {
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
  bodyText = 'Chat with AI',
  iconOnly = false,
  ...props
}: {
  messages?: Nullable<ChatMessage[]>
  insightId?: Nullable<string>
  bodyText?: string
  iconOnly?: boolean
} & ButtonProps) {
  const { createNewThread, loading } = useChatbot()

  const handleClick = () => {
    createNewThread({
      insightId,
      // TODO: update this
      summary: 'Further questions about an insight from Plural AI',
      summarized: false,
      messages: messages || [],
    })
  }
  return iconOnly ? (
    <IconFrame
      clickable
      onClick={handleClick}
      tooltip
      textValue={bodyText}
      icon={loading ? <Spinner /> : <ChatOutlineIcon />}
      type="secondary"
      {...props}
    />
  ) : (
    <Button
      loading={loading}
      onClick={handleClick}
      startIcon={<ChatOutlineIcon />}
      {...props}
    >
      {bodyText}
    </Button>
  )
}
