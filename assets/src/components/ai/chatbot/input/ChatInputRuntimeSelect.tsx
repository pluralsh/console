import { Toast } from '@pluralsh/design-system'
import {
  ChatThreadTinyFragment,
  useUpdateChatThreadMutation,
} from '../../../../generated/graphql.ts'

import { AIAgentRuntimesSelector } from 'components/ai/agent-runs/AIAgentRuntimesSelector.tsx'
import { FeatureFlagContext } from 'components/flows/FeatureFlagContext.tsx'
import { use, useCallback } from 'react'

export function ChatInputRuntimeSelect({
  currentThread,
}: {
  currentThread: ChatThreadTinyFragment
}) {
  const { featureFlags } = use(FeatureFlagContext)

  const [
    updateThread,
    { loading: updateThreadLoading, error: updateThreadError },
  ] = useUpdateChatThreadMutation()

  const currentRuntimeId = currentThread?.session?.runtime?.id

  const onRuntimeChange = useCallback(
    (runtimeId: string | null) => {
      if (runtimeId !== currentRuntimeId)
        updateThread({
          variables: {
            id: currentThread.id,
            attributes: {
              summary: currentThread.summary,
              session: { runtimeId },
            },
          },
        })
    },
    [currentThread.id, currentThread.summary, currentRuntimeId, updateThread]
  )

  if (!featureFlags.Agent) return null

  return (
    <>
      <AIAgentRuntimesSelector
        type="minimal"
        allowDeselect
        updateLoading={updateThreadLoading}
        selectedRuntimeId={currentRuntimeId}
        setSelectedRuntimeId={(runtimeId) => onRuntimeChange(runtimeId ?? null)}
      />
      <Toast
        show={!!updateThreadError}
        severity="danger"
        position="bottom"
        marginBottom="medium"
      >
        Error updating thread settings.
      </Toast>
    </>
  )
}
