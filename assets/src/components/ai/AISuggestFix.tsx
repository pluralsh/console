import { Markdown } from '@pluralsh/design-system'
import { ReactNode, useCallback, useState } from 'react'
import {
  AiInsight,
  useAiSuggestedFixLazyQuery,
} from '../../generated/graphql.ts'
import { GqlError } from '../utils/Alert.tsx'
import LoadingIndicator from '../utils/LoadingIndicator.tsx'
import AIPanel from './AIPanel.tsx'
import { AISuggestFixButton } from './AISuggestFixButton.tsx'

interface AISuggestFixProps {
  insight: Nullable<AiInsight>
}

function AISuggestFix({ insight }: AISuggestFixProps): ReactNode {
  const [getSuggestion, { loading, data, error }] = useAiSuggestedFixLazyQuery({
    variables: { insightID: insight?.id ?? '' },
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
        open={open}
        onClose={() => setOpen(false)}
        showCloseIcon
        showClosePanel={!!data?.aiSuggestedFix}
        header="Suggest a fix"
        subheader="Get a suggested fix based on the insight. AI is prone to mistakes, always test changes before application."
      >
        {data?.aiSuggestedFix && <Markdown text={data?.aiSuggestedFix} />}
        {loading && !data && <LoadingIndicator />}
        {!loading && error && <GqlError error={error} />}
      </AIPanel>
    </div>
  )
}

export { AISuggestFix }
