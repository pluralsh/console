import { Confirm } from 'components/utils/Confirm'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { StrongSC } from 'components/utils/typography/Text'
import {
  useDeleteWorkbenchCronMutation,
  WorkbenchCronFragment,
} from 'generated/graphql'
import { truncate } from 'lodash'

export function CronScheduleDeleteModal({
  open,
  cron,
  onClose,
}: {
  open: boolean
  cron: Nullable<WorkbenchCronFragment>
  onClose: () => void
}) {
  const { popToast } = useSimpleToast()
  const [mutation, { loading, error }] = useDeleteWorkbenchCronMutation({
    variables: { id: cron?.id ?? '' },
    onCompleted: () => {
      popToast({
        name: cron?.prompt ?? '',
        action: 'deleted',
        severity: 'danger',
      })
      onClose()
    },
    refetchQueries: ['WorkbenchCrons', 'WorkbenchTriggersSummary'],
    awaitRefetchQueries: true,
  })

  return (
    <Confirm
      open={open}
      close={onClose}
      destructive
      label="Delete schedule"
      loading={loading}
      error={error}
      submit={() => mutation()}
      title="Delete schedule"
      text={
        <span>
          Are you sure you want to delete schedule{' '}
          <StrongSC $color="text-danger">
            {truncate(cron?.prompt ?? '', { length: 30 })}
          </StrongSC>
          ?
        </span>
      }
    />
  )
}
