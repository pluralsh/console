import { useState } from 'react'
import AIButton from './AIButton.tsx'
import { AIPanelOverlay } from './AIPanelOverlay.tsx'
import AIPanel from './AIPanel.tsx'

export default function ExplainWithAI() {
  const [open, setOpen] = useState(false)

  return (
    <div css={{ marginRight: 66, position: 'relative' }}>
      <AIButton
        active={open}
        onClick={() => {
          console.log('x')
          console.log(open)
          setOpen(true)
        }}
        width={163}
      >
        Explain with AI
      </AIButton>
      <AIPanelOverlay
        open={open}
        close={() => setOpen(false)}
      >
        <AIPanel
          header={'AI explain'}
          subheader={'Learn more about the current page with AI'}
          onClose={() => setOpen(false)}
        >
          <div>...</div>
        </AIPanel>
      </AIPanelOverlay>
    </div>
  )
}
