import { Chip, Tooltip, WrapWithIf } from '@pluralsh/design-system'

import { Common_Event, Maybe } from '../../../generated/graphql-kubernetes'

const podStatusSeverity = {
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

export function PodStatusChip({
  status,
  warnings,
}: {
  status: string
  warnings: Maybe<Common_Event>[]
}) {
  let severity = podStatusSeverity[status] ?? 'neutral'

  if (warnings?.length > 0) {
    severity = 'danger'
  }

  return (
    <WrapWithIf
      condition={warnings?.length > 0}
      wrapper={
        <Tooltip
          label={warnings?.map((ev) => ev?.message)?.join(', ')}
          placement="bottom"
        />
      }
    >
      <Chip
        size="small"
        severity={severity}
      >
        {status}
      </Chip>
    </WrapWithIf>
  )
}
