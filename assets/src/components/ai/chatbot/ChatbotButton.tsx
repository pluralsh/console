import { Button, ChatIcon } from '@pluralsh/design-system'
import { AiInsightFragment, AiRole, ChatMessage } from 'generated/graphql.ts'
import { ButtonProps } from 'honorable'
import { Dispatch, ReactNode } from 'react'
import { useChatbot } from '../AIContext.tsx'
import AIButton from '../ExplainWithAIButton.tsx'

const FIX_PREFACE =
  "The following is an insight into an issue into the users infrastructrue we'd like to learn more about:"

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
      startIcon={null}
      css={{
        width: 32,
        height: 32,
      }}
      {...props}
    >
      <ChatIcon />
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
  ...props
}: {
  messages?: Nullable<ChatMessage[]>
} & ButtonProps) {
  const { createNewThread, loading } = useChatbot()

  const handleClick = () => {
    createNewThread({
      // TODO: update this
      summary: 'Further questions about an insight from Plural AI',
      summarized: false,
      messages: messages || [],
    })
  }
  return (
    <Button
      loading={loading}
      onClick={handleClick}
      startIcon={<ChatIcon />}
      {...props}
    >
      Chat with AI
    </Button>
  )
}
