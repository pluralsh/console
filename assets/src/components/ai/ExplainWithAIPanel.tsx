import {
  AiRole,
  ChatMessage,
  useAiCompletionQuery,
} from '../../generated/graphql.ts'
import AIPanel from './AIPanel.tsx'
import LoadingIndicator from '../utils/LoadingIndicator.tsx'
import { Markdown } from '@pluralsh/design-system'
import { GqlError } from '../utils/Alert.tsx'
import { useExplainWithAIContext } from './AIContext.tsx'
import { ChatWithAIButton } from './chatbot/ChatbotButton.tsx'

function explainMsg(msg: string): ChatMessage {
  return {
    content: msg,
    role: AiRole.Assistant,
  }
}

export default function ExplainWithAIPanel({
  prompt,
  open,
  onClose,
}: {
  prompt: string
  open: boolean
  onClose: () => void
}) {
  const { system } = useExplainWithAIContext()
  const { data, loading, error } = useAiCompletionQuery({
    variables: { system, input: prompt },
  })

  return (
    <AIPanel
      open={open}
      onClose={onClose}
      showCloseIcon
      showClosePanel={!!data?.aiCompletion}
      header={'AI explain'}
      subheader={'Learn more about the current page with AI'}
      footer={
        data?.aiCompletion && (
          <ChatWithAIButton
            primary
            messages={[explainMsg(data.aiCompletion)]}
          />
        )
      }
    >
      {data?.aiCompletion && <Markdown text={data.aiCompletion} />}
      {loading && <LoadingIndicator></LoadingIndicator>}
      {error && <GqlError error={error} />}
    </AIPanel>
  )
}
