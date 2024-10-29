import { useState } from 'react'
import AIButton from './ExplainWithAIButton.tsx'
import { useExplainWithAIPrompt } from './ExplainWithAIContext.tsx'
import ExplainWithAIPanel from './ExplainWithAIPanel.tsx'

export default function ExplainWithAI() {
  const [open, setOpen] = useState(false)
  const prompt = useExplainWithAIPrompt()

  return (
    <div
      css={{
        marginRight: 66,
        position: 'relative',
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
