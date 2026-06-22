import { Confirm } from 'components/utils/Confirm'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { StrongSC } from 'components/utils/typography/Text'
import {
  ChatProviderConnectionFragment,
  useDeleteChatProviderConnectionMutation,
} from 'generated/graphql'

export function DeleteChatbotConnectionModal({
  open,
  chatbot,
  onClose,
  refetch,
}: {
  open: boolean
  chatbot: Nullable<ChatProviderConnectionFragment>
  onClose: () => void
  refetch?: () => void
}) {
  const { popToast } = useSimpleToast()
  const label = chatbot?.name ?? 'chatbot'

  const [mutation, { loading, error }] =
    useDeleteChatProviderConnectionMutation({
      variables: { id: chatbot?.id ?? '' },
      onCompleted: () => {
        popToast({
          content: `${label} deleted`,
          severity: 'success',
        })
        refetch?.()
        onClose()
      },
      refetchQueries: ['ChatProviderConnections'],
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
