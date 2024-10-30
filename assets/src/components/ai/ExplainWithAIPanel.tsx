import { useAiCompletionQuery } from '../../generated/graphql.ts'
import AIPanel from './AIPanel.tsx'
import LoadingIndicator from '../utils/LoadingIndicator.tsx'
import { Markdown } from '@pluralsh/design-system'
import { GqlError } from '../utils/Alert.tsx'
import { useExplainWithAIContext } from './AIContext.tsx'

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
    >
      {data?.aiCompletion && <Markdown text={data.aiCompletion} />}
      {loading && <LoadingIndicator></LoadingIndicator>}
      {error && <GqlError error={error} />}
    </AIPanel>
  )
}
