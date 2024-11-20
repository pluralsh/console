import { AiInsightFragment, AiRole } from 'generated/graphql'
import { ChatbotMessagesWrapper } from './ChatbotPanelThread.tsx'
import { ChatMessage } from './ChatMessage'

export function ChatbotPanelInsight({
  currentInsight,
  fullscreen,
}: {
  currentInsight: AiInsightFragment
  fullscreen: boolean
}) {
  return (
    <ChatbotMessagesWrapper fullscreen={fullscreen}>
      <ChatMessage
        key={currentInsight.id}
        role={AiRole.Assistant}
        content={currentInsight.text ?? ''}
        disableActions={true}
      />
    </ChatbotMessagesWrapper>
  )
}
