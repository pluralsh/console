import { AiInsightFragment, AiRole, EvidenceType } from 'generated/graphql'
import { ChatbotMessagesWrapper } from './ChatbotPanelThread.tsx'
import { ChatMessage } from './ChatMessage'
import { ChatbotPanelEvidence } from './ChatbotPanelEvidence.tsx'
import { isNonNullable } from 'utils/isNonNullable.ts'
import { isEmpty } from 'lodash'

export function ChatbotPanelInsight({
  currentInsight,
}: {
  currentInsight: AiInsightFragment
}) {
  const evidence = currentInsight?.evidence
    ?.filter(isNonNullable)
    .filter(({ type }) => type === EvidenceType.Log || type === EvidenceType.Pr) // will change when we support alert evidence

  return (
    <ChatbotMessagesWrapper>
      <ChatMessage
        key={currentInsight.id}
        role={AiRole.Assistant}
        content={currentInsight.text ?? ''}
        disableActions={true}
      />
      {!isEmpty(evidence) && (
        <ChatbotPanelEvidence
          headerText="This insight was created based on the evidence below:"
          evidence={evidence ?? []}
        />
      )}
    </ChatbotMessagesWrapper>
  )
}
