import { Confirm } from 'components/utils/Confirm'
import {
  useDeleteWorkbenchCronMutation,
  WorkbenchCronFragment,
  WorkbenchCronsDocument,
} from 'generated/graphql'

export function WorkbenchScheduleDeleteModal({
  workbenchId,
  open,
  cron,
  onClose,
}: {
  workbenchId: string
  open: boolean
  cron: Nullable<WorkbenchCronFragment>
  onClose: () => void
}) {
  const [deleteWorkbenchCron, { loading, error }] =
    useDeleteWorkbenchCronMutation({
      refetchQueries: [
        {
          query: WorkbenchCronsDocument,
          variables: { id: workbenchId, first: 100 },
        },
      ],
      awaitRefetchQueries: true,
      onCompleted: onClose,
    })

  return (
    <Confirm
      open={open}
      close={onClose}
      destructive
      label="Delete schedule"
      loading={loading}
      error={error}
      submit={() => {
        if (!cron) return
        deleteWorkbenchCron({ variables: { id: cron.id } })
      }}
      title="Delete schedule"
      text={<span>Are you sure you want to delete this schedule?</span>}
    />
  )
}
