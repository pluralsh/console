import { AiInsight, AiRole } from 'generated/graphql'
import { ChatbotMessagesSC, ChatMessage } from './ChatbotPanelThread.tsx'

export function ChatbotPanelInsight({
  currentInsight,
  fullscreen,
}: {
  currentInsight: AiInsight
  fullscreen: boolean
}) {
  return (
    <ChatbotMessagesSC $fullscreen={fullscreen}>
      <ChatMessage
        key={currentInsight.id}
        role={AiRole.Assistant}
        content={currentInsight.text ?? ''}
        disableActions={true}
      />
    </ChatbotMessagesSC>
  )
}
