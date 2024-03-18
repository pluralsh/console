import { Chip } from '@pluralsh/design-system'

export const podStatusToSeverity = {
  Running: 'success',
  Completed: 'info',
  Succeeded: 'info',
  Pending: 'warning',
  NotReady: 'warning',
  Failed: 'danger',
  Terminating: 'danger',
}

export function CronJobSuspendChip({
  suspend,
}: {
  suspend: boolean | undefined
}) {
  return (
    <Chip
      size="small"
      severity={suspend ? 'warning' : 'neutral'}
    >
      {suspend ? 'Suspended' : 'Running'}
    </Chip>
  )
}
