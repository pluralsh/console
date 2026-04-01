import { Confirm } from 'components/utils/Confirm'
import { DEFAULT_PAGE_SIZE } from 'components/utils/table/useFetchPaginatedData'
import {
  useDeleteWorkbenchCronMutation,
  WorkbenchCronFragment,
  WorkbenchCronsDocument,
  WorkbenchCronsQuery,
} from 'generated/graphql'
import { removeConnection, updateCache } from 'utils/graphql'

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
      update: (cache, { data }) => {
        const deletedCron = data?.deleteWorkbenchCron
        if (!deletedCron) return

        updateCache<WorkbenchCronsQuery>(cache, {
          query: WorkbenchCronsDocument,
          variables: { id: workbenchId, first: DEFAULT_PAGE_SIZE },
          update: (prev) => {
            if (!prev.workbench) return prev

            return {
              ...prev,
              workbench: removeConnection(prev.workbench, deletedCron, 'crons'),
            }
          },
        })
      },
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
