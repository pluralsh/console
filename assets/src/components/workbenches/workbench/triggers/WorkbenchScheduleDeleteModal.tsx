import { Confirm } from 'components/utils/Confirm'
import { useState } from 'react'
import {
  useDeleteWorkbenchCronMutation,
  WorkbenchCronFragment,
} from 'generated/graphql'

export function WorkbenchScheduleDeleteModal({
  open,
  cron,
  onClose,
  onDeleted,
}: {
  open: boolean
  cron: Nullable<WorkbenchCronFragment>
  onClose: () => void
  onDeleted?: () => void | Promise<void>
}) {
  const [finalizing, setFinalizing] = useState(false)
  const [mutation, { loading, error }] = useDeleteWorkbenchCronMutation()

  const handleClose = () => {
    setFinalizing(false)
    onClose()
  }

  const handleDelete = async () => {
    if (!cron || finalizing) return

    setFinalizing(true)

    try {
      await mutation({ variables: { id: cron.id } })
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
      label="Delete schedule"
      loading={loading || finalizing}
      error={error}
      submit={() => handleDelete()}
      title="Delete schedule"
      text={<span>Are you sure you want to delete this schedule?</span>}
    />
  )
}
