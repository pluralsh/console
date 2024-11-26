import { ComponentProps } from 'react'
import { Chip, ChipProps } from '@pluralsh/design-system'
import capitalize from 'lodash/capitalize'

import { StackStatus } from '../../../generated/graphql'

const statusToSeverity = {
  [StackStatus.Queued]: 'neutral',
  [StackStatus.Pending]: 'warning',
  [StackStatus.Running]: 'info',
  [StackStatus.Cancelled]: 'neutral',
  [StackStatus.Failed]: 'danger',
  [StackStatus.Successful]: 'success',
  [StackStatus.PendingApproval]: 'warning',
} as const satisfies Record<
  StackStatus,
  ComponentProps<typeof Chip>['severity']
>

export default function StackStatusChip({
  status,
  deleting = false,
  ...props
}: {
  status?: StackStatus
  deleting?: boolean
} & ChipProps) {
  const severity = statusToSeverity[status ?? '']

  return deleting ? (
    <Chip
      severity="danger"
      {...props}
    >
      Deleting
    </Chip>
  ) : (
    <Chip
      severity={severity}
      {...props}
    >
      {status === StackStatus.PendingApproval
        ? 'Pending Approval'
        : capitalize(status)}
    </Chip>
  )
}
