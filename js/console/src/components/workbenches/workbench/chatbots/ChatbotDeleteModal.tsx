import { Confirm } from 'components/utils/Confirm'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { StrongSC } from 'components/utils/typography/Text'
import {
  useDeleteWorkbenchChatbotMutation,
  WorkbenchChatbotFragment,
} from 'generated/graphql'

export function ChatbotDeleteModal({
  open,
  chatbot,
  onClose,
}: {
  open: boolean
  chatbot: Nullable<WorkbenchChatbotFragment>
  onClose: () => void
}) {
  const { popToast } = useSimpleToast()
  const label = chatbot?.chatConnection?.name ?? chatbot?.channel ?? 'chatbot'

  const [mutation, { loading, error }] = useDeleteWorkbenchChatbotMutation({
    variables: { id: chatbot?.id ?? '' },
    onCompleted: () => {
      popToast({
        content: `${label} deleted`,
        severity: 'success',
      })
      onClose()
    },
    refetchQueries: ['WorkbenchChatbots', 'WorkbenchTriggersSummary'],
    awaitRefetchQueries: true,
  })

  return (
    <Confirm
      open={open}
      close={onClose}
      destructive
      label="Delete chatbot"
      loading={loading}
      error={error}
      submit={() => mutation()}
      title="Delete chatbot"
      text={
        <span>
          Are you sure you want to delete chatbot{' '}
          <StrongSC $color="text-danger">{label}</StrongSC>?
        </span>
      }
    />
  )
}
