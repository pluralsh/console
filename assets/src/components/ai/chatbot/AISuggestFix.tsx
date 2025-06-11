import {
  Button,
  LinkoutIcon,
  Markdown,
  PrOpenIcon,
  Toast,
} from '@pluralsh/design-system'
import { useDeploymentSettings } from 'components/contexts/DeploymentSettingsContext.tsx'
import {
  ComponentPropsWithRef,
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
  useAiFixPrMutation,
  useAiSuggestedFixLazyQuery,
} from '../../../generated/graphql.ts'
import { GqlError } from '../../utils/Alert.tsx'
import LoadingIndicator from '../../utils/LoadingIndicator.tsx'
import { AIPanel } from '../AIPanel.tsx'
import { AISuggestFixButton } from './AISuggestFixButton.tsx'
import { ChatWithAIButton, insightMessage } from './ChatbotButton.tsx'

type AISuggestFixProps = {
  insight: Nullable<AiInsightFragment>
  buttonProps?: ComponentPropsWithRef<typeof AISuggestFixButton>
  iconOnly?: boolean
}

function fixMessage(fix: string): ChatMessage {
  return {
    content: `Here is the fix we've come up with so far:\n\n${fix}`,
    role: AiRole.Assistant,
  }
}

export function AiStream({
  insightId,
  scopeId,
  recommendationId,
  scrollToBottom,
  setStreaming,
}: {
  insightId?: string
  scopeId?: string
  recommendationId?: string
  scrollToBottom?: () => void
  setStreaming?: Dispatch<SetStateAction<boolean>>
}) {
  const [streamedMessage, setStreamedMessage] = useState<AiDelta[]>([])
  useAiChatStreamSubscription({
    variables: { insightId, scopeId, recommendationId },
    onData: ({ data: { data } }) => {
      setStreaming?.(true)
      if ((data?.aiStream?.seq ?? 1) % 120 === 0) scrollToBottom?.()
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

function FixPr({
  insightId,
  fix,
}: {
  insightId: string
  fix: string
}): ReactNode {
  const [mutation, { data, loading, error }] = useAiFixPrMutation({
    variables: { insightId, messages: [{ role: AiRole.User, content: fix }] },
  })

  return (
    <>
      {error && (
        <Toast
          severity="danger"
          position="top-right"
          margin="large"
          heading="PR Creation Failed"
        >
          {error.message}
        </Toast>
      )}
      {data?.aiFixPr ? (
        <Button
          primary
          type="button"
          endIcon={<LinkoutIcon />}
          as="a"
          href={data?.aiFixPr?.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          View PR
        </Button>
      ) : (
        <Button
          startIcon={<PrOpenIcon />}
          onClick={() => mutation()}
          loading={loading}
        >
          Create PR
        </Button>
      )}
    </>
  )
}

function AISuggestFix({ insight, buttonProps }: AISuggestFixProps) {
  const settings = useDeploymentSettings()
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

  const tools = !!settings.ai?.toolsEnabled
  const chatButton = (
    <ChatWithAIButton
      secondary={tools}
      insightId={insight?.id}
      messages={[
        insightMessage(insight),
        fixMessage(data?.aiSuggestedFix || ''),
      ]}
    />
  )

  return (
    <div css={{ position: 'relative' }}>
      <AISuggestFixButton
        {...buttonProps}
        onClick={showPanel}
      />
      <AIPanel
        ref={ref}
        open={open}
        onClose={() => setOpen(false)}
        showCloseIcon
        showClosePanel={!!data?.aiSuggestedFix}
        header="Suggest a fix"
        subheader="Get a suggested fix based on the insight. AI is prone to mistakes, always test changes before application."
        secondaryButton={tools ? chatButton : null}
        footer={
          tools && insight && data?.aiSuggestedFix ? (
            <FixPr
              insightId={insight.id}
              fix={data.aiSuggestedFix}
            />
          ) : (
            chatButton
          )
        }
      >
        {data?.aiSuggestedFix && <Markdown text={data?.aiSuggestedFix} />}
        {loading && !data && (
          <AiStream
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
