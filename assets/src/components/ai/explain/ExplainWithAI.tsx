import { useState } from 'react'
import AIButton from './ExplainWithAIButton.tsx'
import { useExplainWithAIContext } from '../AIContext.tsx'
import ExplainWithAIPanel from './ExplainWithAIPanel.tsx'
import { useDeploymentSettings } from '../../contexts/DeploymentSettingsContext.tsx'

export default function ExplainWithAI() {
  const [open, setOpen] = useState(false)
  const { ai } = useDeploymentSettings()
  const { prompt } = useExplainWithAIContext()

  if (!ai?.enabled) return null

  return (
    <div css={{ position: 'relative' }}>
      <AIButton
        active={open}
        visible={!!prompt}
        onClick={() => setOpen(true)}
      >
        Explain this page
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
