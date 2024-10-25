import { useState } from 'react'
import AIButton from './ExplainWithAIButton.tsx'
import { useExplainWithAIPrompt } from './ExplainWithAIContext.tsx'
import { useTheme } from 'styled-components'
import ExplainWithAIPanel from './ExplainWithAIPanel.tsx'

export default function ExplainWithAI() {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const prompt = useExplainWithAIPrompt()

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
        visible={!!prompt}
        onClick={() => setOpen(true)}
        width={163}
      >
        Explain with AI
      </AIButton>
      {open && prompt && (
        <ExplainWithAIPanel
          prompt={prompt}
          open={open}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
