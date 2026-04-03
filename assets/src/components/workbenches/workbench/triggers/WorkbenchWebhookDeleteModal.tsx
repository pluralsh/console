import { Confirm } from 'components/utils/Confirm'
import {
  useDeleteWorkbenchWebhookMutation,
  WorkbenchWebhookFragment,
} from 'generated/graphql'
import { useState } from 'react'

export function WorkbenchWebhookDeleteModal({
  open,
  webhook,
  onClose,
  onDeleted,
}: {
  open: boolean
  webhook: Nullable<WorkbenchWebhookFragment>
  onClose: () => void
  onDeleted?: () => void | Promise<void>
}) {
  const [finalizing, setFinalizing] = useState(false)
  const [mutation, { loading, error }] = useDeleteWorkbenchWebhookMutation()

  const handleClose = () => {
    setFinalizing(false)
    onClose()
  }

  const handleDelete = async () => {
    if (!webhook || finalizing) return

    setFinalizing(true)

    try {
      await mutation({ variables: { id: webhook.id } })
      await onDeleted?.()
      handleClose()
    } catch {
      setFinalizing(false)
    }
  }

  return (
    <Confirm
      open={open}
      close={handleClose}
      destructive
      label="Delete webhook"
      loading={loading || finalizing}
      error={error}
      submit={() => handleDelete()}
      title="Delete webhook"
      text={<span>Are you sure you want to delete this webhook?</span>}
    />
  )
}
