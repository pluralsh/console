import {
  AiRole,
  ChatMessage,
  useAiCompletionQuery,
} from '../../../generated/graphql.ts'
import AIPanel from '../AIPanel.tsx'
import { Markdown } from '@pluralsh/design-system'
import { GqlError } from '../../utils/Alert.tsx'
import { useExplainWithAIContext } from '../AIContext.tsx'
import { ChatWithAIButton } from '../chatbot/ChatbotButton.tsx'
import { uniqueId } from 'lodash'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Loading } from '../chatbot/AISuggestFix.tsx'

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
  const scopeId = useMemo(() => uniqueId(), [])
  const ref = useRef<HTMLDivElement>(null)
  const [streaming, setStreaming] = useState<boolean>(false)
  const scrollToBottom = useCallback(() => {
    ref.current?.scrollTo({
      top: ref.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [ref])

  const { system } = useExplainWithAIContext()
  const { data, loading, error } = useAiCompletionQuery({
    variables: { system, input: prompt, scopeId },
    onCompleted: () => streaming && scrollToBottom(),
  })

  return (
    <AIPanel
      ref={ref}
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
      {loading && (
        <Loading
          setStreaming={setStreaming}
          scrollToBottom={scrollToBottom}
          scopeId={scopeId}
        />
      )}
      {error && <GqlError error={error} />}
    </AIPanel>
  )
}
