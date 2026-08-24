import { useAIEnabled } from 'components/contexts/DeploymentSettingsContext'
import { useWorkbenchOptions } from 'components/workbenches/useWorkbenchOptions'

export function useLegacyAiChatEnabled() {
  const aiEnabled = useAIEnabled()
  const { hasWorkbenches, loading } = useWorkbenchOptions()

  return !!aiEnabled && !hasWorkbenches && !loading
}
