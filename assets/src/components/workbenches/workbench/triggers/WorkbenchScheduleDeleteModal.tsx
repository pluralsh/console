import { Confirm } from 'components/utils/Confirm'
import {
  useDeleteWorkbenchCronMutation,
  WorkbenchCronFragment,
  WorkbenchCronsDocument,
} from 'generated/graphql'

export function WorkbenchScheduleDeleteModal({
  workbenchId,
  cronToDelete,
  onClose,
}: {
  workbenchId: string
  cronToDelete: Nullable<WorkbenchCronFragment>
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
      open={!!cronToDelete}
      close={onClose}
      destructive
      label="Delete schedule"
      loading={loading}
      error={error}
      submit={() => {
        if (!cronToDelete) return
        deleteWorkbenchCron({ variables: { id: cronToDelete.id } })
      }}
      title="Delete schedule"
      text={<span>Are you sure you want to delete this schedule?</span>}
    />
  )
}
