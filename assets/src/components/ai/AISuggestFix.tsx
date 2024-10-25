import { ReactNode, useCallback, useState } from 'react'
import { useTheme } from 'styled-components'
import { useAiSuggestedFixLazyQuery } from '../../generated/graphql.ts'
import { GqlError } from '../utils/Alert.tsx'
import LoadingIndicator from '../utils/LoadingIndicator.tsx'
import AIPanel from './AIPanel.tsx'
import { AISuggestFixButton } from './AISuggestFixButton.tsx'

interface AISuggestFixProps {
  insightID: string
}

function AISuggestFix({ insightID }: AISuggestFixProps): ReactNode {
  const theme = useTheme()
  const [getSuggestion, { loading, data, error }] = useAiSuggestedFixLazyQuery({
    variables: { insightID },
  })

  const [open, setOpen] = useState(false)
  const showPanel = useCallback(() => {
    setOpen(true)
    getSuggestion()
  }, [getSuggestion])

  if (!insightID) {
    return null
  }

  return (
    <div
      css={{
        position: 'relative',
        zIndex: theme.zIndexes.modal,
      }}
    >
      <AISuggestFixButton onClick={showPanel} />
      <AIPanel
        open={open}
        onClose={() => setOpen(false)}
        showCloseIcon
        header="Suggest a fix"
        subheader="Get a suggested fix based on the insight. AI is prone to mistakes, always test changes before application."
      >
        <div>{data?.aiSuggestedFix}</div>
        {loading && !data?.aiSuggestedFix && <LoadingIndicator />}
        {!loading && error && <GqlError error={error} />}
      </AIPanel>
    </div>
  )
}

export { AISuggestFix }
