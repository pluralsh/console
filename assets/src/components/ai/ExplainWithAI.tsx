import { useState } from 'react'
import AIButton from './ExplainWithAIButton.tsx'
import AIPanel from './AIPanel.tsx'
import { useExplainWithAIPrompt } from './ExplainWithAIContext.tsx'
import { useAiQuery } from '../../generated/graphql.ts'
import LoadingIndicator from '../utils/LoadingIndicator.tsx'
import { useTheme } from 'styled-components'

export default function ExplainWithAI() {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const prompt = useExplainWithAIPrompt()

  if (!prompt) return null

  return (
    <div
      css={{
        marginRight: 66,
        position: 'relative',
        zIndex: theme.zIndexes.modal,
      }}
    >
      <AIButton
        active={open}
        onClick={() => setOpen(true)}
        width={163}
      >
        Explain with AI
      </AIButton>
      <ExplainWithAIPanel
        prompt={prompt}
        open={open}
        onClose={() => setOpen(false)}
      />
    </div>
  )
}

function ExplainWithAIPanel({
  prompt,
  open,
  onClose,
}: {
  prompt: string
  open: boolean
  onClose: () => void
}) {
  const { data, loading, error } = useAiQuery({ variables: { prompt } })

  console.error(error)

  return (
    <AIPanel
      open={open}
      onClose={onClose}
      showCloseIcon
      header={'AI explain'}
      subheader={'Learn more about the current page with AI'}
    >
      <div>{data?.ai}</div>
      {loading && <LoadingIndicator></LoadingIndicator>}
      {error && <div>{error.message}</div>}
    </AIPanel>
  )
}
