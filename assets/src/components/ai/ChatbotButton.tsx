import { Button, ChatIcon } from '@pluralsh/design-system'
import { ButtonProps } from 'honorable'
import { Dispatch, ReactNode } from 'react'
import AIButton from './ExplainWithAIButton.tsx'

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

export function ChatbotWithAIButton({
  onClick,
  ...props
}: ButtonProps): ReactNode {
  return (
    <Button
      onClick={onClick}
      startIcon={<ChatIcon />}
      {...props}
    >
      Chat with AI
    </Button>
  )
}
