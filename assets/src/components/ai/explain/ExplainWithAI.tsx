import { useState } from 'react'
import { useTheme } from 'styled-components'
import AIButton from './ExplainWithAIButton.tsx'
import { useExplainWithAIContext } from '../AIContext.tsx'
import ExplainWithAIPanel from './ExplainWithAIPanel.tsx'
import { useDeploymentSettings } from '../../contexts/DeploymentSettingsContext.tsx'

export default function ExplainWithAI() {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const { ai } = useDeploymentSettings()
  const { prompt } = useExplainWithAIContext()

  if (!ai?.enabled) return null

  return (
    <div
      css={{
        // align with top bar search
        marginRight: theme.spacing.xsmall + 2,
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
