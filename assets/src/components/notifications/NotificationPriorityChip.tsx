import { ChipProps } from '@pluralsh/design-system/dist/components/Chip'
import { Chip } from '@pluralsh/design-system'
import { ComponentProps } from 'react'
import capitalize from 'lodash/capitalize'

import { Maybe, NotificationPriority } from '../../generated/graphql'

const priorityToSeverity = {
  [NotificationPriority.Low]: 'info',
  [NotificationPriority.Medium]: 'warning',
  [NotificationPriority.High]: 'danger',
} as const satisfies Record<
  NotificationPriority,
  ComponentProps<typeof Chip>['severity']
>

export default function NotificationPriorityChip({
  priority,
  ...props
}: {
  priority?: Maybe<NotificationPriority>
} & ChipProps) {
  if (!priority) {
    return null
  }

  return (
    <Chip
      severity={priorityToSeverity[priority]}
      {...props}
    >
      {capitalize(priority)}
    </Chip>
  )
}
