import { useState } from 'react'
import AIButton from './ExplainWithAIButton.tsx'
import AIPanel from './AIPanel.tsx'

export default function ExplainWithAI() {
  const [open, setOpen] = useState(false)

  return (
    <div css={{ marginRight: 66, position: 'relative' }}>
      <AIButton
        active={open}
        onClick={() => setOpen(true)}
        width={163}
      >
        Explain with AI
      </AIButton>
      <AIPanel
        open={open}
        onClose={() => setOpen(false)}
        showCloseIcon
        header={'AI explain'}
        subheader={'Learn more about the current page with AI'}
      >
        <div>...</div>
      </AIPanel>
    </div>
  )
}
