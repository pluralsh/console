import { Confirm } from 'components/utils/Confirm'
import {
  useDeleteWorkbenchWebhookMutation,
  WorkbenchWebhookFragment,
} from 'generated/graphql'
import { WEBHOOK_TRIGGER_REFETCH_QUERIES } from './WorkbenchTriggers'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { StrongSC } from 'components/utils/typography/Text'

export function WorkbenchWebhookDeleteModal({
  open,
  webhook,
  onClose,
}: {
  open: boolean
  webhook: Nullable<WorkbenchWebhookFragment>
  onClose: () => void
}) {
  const { popToast } = useSimpleToast()
  const [mutation, { loading, error }] = useDeleteWorkbenchWebhookMutation({
    variables: { id: webhook?.id ?? '' },
    onCompleted: () => {
      popToast({
        name: webhook?.name ?? '',
        action: 'deleted',
        color: 'icon-danger',
      })
      onClose()
    },
    refetchQueries: WEBHOOK_TRIGGER_REFETCH_QUERIES,
    awaitRefetchQueries: true,
  })

  return (
    <Confirm
      open={open}
      close={onClose}
      destructive
      label="Delete webhook"
      loading={loading}
      error={error}
      submit={() => mutation()}
      title="Delete webhook"
      text={
        <span>
          Are you sure you want to delete webhook{' '}
          <StrongSC $color="text-danger">{webhook?.name}</StrongSC>?
        </span>
      }
    />
  )
}
