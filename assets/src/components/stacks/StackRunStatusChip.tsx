import { ComponentProps } from 'react'
import { Chip } from '@pluralsh/design-system'
import { StackStatus } from 'generated/graphql'
import capitalize from 'lodash/capitalize'

import { ChipProps } from '@pluralsh/design-system/dist/components/Chip'

export const statusToSeverity = {
  [StackStatus.Queued]: 'neutral',
  [StackStatus.Pending]: 'warning',
  [StackStatus.Running]: 'info',
  [StackStatus.Cancelled]: 'neutral',
  [StackStatus.Failed]: 'danger',
  [StackStatus.Successful]: 'success',
} as const satisfies Record<
  StackStatus,
  ComponentProps<typeof Chip>['severity']
>

export function StackRunStatusChip({
  status,
  ...props
}: {
  status?: StackStatus
  size?: number
} & ChipProps) {
  const severity = statusToSeverity[status ?? '']

  return (
    <Chip
      severity={severity}
      {...props}
    >
      {capitalize(status)}
    </Chip>
  )
}
