import { Button, ChatIcon } from '@pluralsh/design-system'
import { AiInsightFragment, AiRole, ChatMessage } from 'generated/graphql.ts'
import { ButtonProps } from 'honorable'
import { Dispatch, ReactNode } from 'react'
import { useChatbot } from '../AIContext.tsx'
import AIButton from '../ExplainWithAIButton.tsx'

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

export function ChatWithAIButton({
  insight,
  ...props
}: {
  insight?: Nullable<AiInsightFragment>
} & ButtonProps) {
  const { createNewThread, loading } = useChatbot()

  const handleClick = () => {
    const messages: ChatMessage[] = []
    if (insight) {
      messages.push({
        content: insight.summary ?? '',
        role: AiRole.Assistant,
      })
    }
    createNewThread({
      // TODO: update this
      summary: 'Further questions about an insight from Plural AI',
      summarized: false,
      messages,
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
