import {
  ChatThreadTinyFragment,
  useUpdateChatThreadMutation,
} from '../../../../generated/graphql.ts'
import { Toast } from '@pluralsh/design-system'

import ClusterSelector from '../../../cd/utils/ClusterSelector.tsx'

export function ChatInputClusterSelect({
  currentThread,
}: {
  currentThread: ChatThreadTinyFragment
}) {
  const [
    updateThread,
    { loading: updateThreadLoading, error: updateThreadError },
  ] = useUpdateChatThreadMutation()

  // TODO:
  //  Change the button in the chatbot to indicate that the agent is selected.
  //  When the button is clicked then the _createAgentSession mutation should be called
  //  if _agentSessionLoading is false at that time.

  return (
    <>
      <div css={{ width: 220 }}>
        <ClusterSelector
          allowDeselect
          onClusterChange={(cluster) => {
            if (cluster?.id !== currentThread?.session?.cluster?.id)
              updateThread({
                variables: {
                  id: currentThread.id,
                  attributes: {
                    summary: currentThread.summary,
                    session: { clusterId: cluster?.id ?? null },
                  },
                },
              })
          }}
          clusterId={currentThread?.session?.cluster?.id}
          loading={updateThreadLoading}
          placeholder="Select cluster"
          startIcon={null}
          deselectLabel="Deselect"
          inputProps={{ style: { minHeight: 18, height: 18 } }}
        />
      </div>
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
