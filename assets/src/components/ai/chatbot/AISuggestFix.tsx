import { Markdown } from '@pluralsh/design-system'
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useRef,
  useState,
} from 'react'
import {
  AiDelta,
  AiInsightFragment,
  AiRole,
  ChatMessage,
  useAiChatStreamSubscription,
  useAiSuggestedFixLazyQuery,
} from '../../../generated/graphql.ts'
import { GqlError } from '../../utils/Alert.tsx'
import LoadingIndicator from '../../utils/LoadingIndicator.tsx'
import AIPanel from '../AIPanel.tsx'
import { AISuggestFixButton } from './AISuggestFixButton.tsx'
import { ChatWithAIButton, insightMessage } from './ChatbotButton.tsx'

interface AISuggestFixProps {
  insight: Nullable<AiInsightFragment>
}

function fixMessage(fix: string): ChatMessage {
  return {
    content: `Here is the fix we've come up with so far:\n\n${fix}`,
    role: AiRole.Assistant,
  }
}

function Loading({
  insightId,
  scrollToBottom,
  setStreaming,
}: {
  insightId: string
  scrollToBottom: () => void
  setStreaming: Dispatch<SetStateAction<boolean>>
}): ReactNode {
  const [streamedMessage, setStreamedMessage] = useState<AiDelta[]>([])
  useAiChatStreamSubscription({
    variables: { insightId },
    onData: ({ data: { data } }) => {
      setStreaming(true)
      if ((data?.aiStream?.seq ?? 1) % 120 === 0) scrollToBottom()
      setStreamedMessage((streamedMessage) => [
        ...streamedMessage,
        {
          seq: data?.aiStream?.seq ?? 0,
          content: data?.aiStream?.content ?? '',
        },
      ])
    },
  })

  if (!streamedMessage.length) {
    return <LoadingIndicator />
  }

  return (
    <Markdown
      text={streamedMessage
        .sort((a, b) => a.seq - b.seq)
        .map((delta) => delta.content)
        .join('')}
    />
  )
}

function AISuggestFix({ insight }: AISuggestFixProps): ReactNode {
  const ref = useRef<HTMLDivElement>(null)
  const [streaming, setStreaming] = useState<boolean>(false)
  const scrollToBottom = useCallback(() => {
    ref.current?.scrollTo({
      top: ref.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [ref])

  const [getSuggestion, { loading, data, error }] = useAiSuggestedFixLazyQuery({
    variables: { insightID: insight?.id ?? '' },
    onCompleted: () => streaming && scrollToBottom(),
    fetchPolicy: 'network-only',
  })

  const [open, setOpen] = useState(false)
  const showPanel = useCallback(() => {
    setOpen(true)
    getSuggestion()
  }, [getSuggestion])

  if (!insight || !insight?.text) {
    return null
  }

  return (
    <div
      css={{
        position: 'relative',
      }}
    >
      <AISuggestFixButton onClick={showPanel} />
      <AIPanel
        ref={ref}
        open={open}
        onClose={() => setOpen(false)}
        showCloseIcon
        showClosePanel={!!data?.aiSuggestedFix}
        header="Suggest a fix"
        subheader="Get a suggested fix based on the insight. AI is prone to mistakes, always test changes before application."
        footer={
          <ChatWithAIButton
            primary
            insightId={insight?.id}
            messages={[
              insightMessage(insight),
              fixMessage(data?.aiSuggestedFix || ''),
            ]}
          />
        }
      >
        {data?.aiSuggestedFix && <Markdown text={data?.aiSuggestedFix} />}
        {loading && !data && (
          <Loading
            insightId={insight.id}
            scrollToBottom={scrollToBottom}
            setStreaming={setStreaming}
          />
        )}
        {!loading && error && <GqlError error={error} />}
      </AIPanel>
    </div>
  )
}

export { AISuggestFix }
