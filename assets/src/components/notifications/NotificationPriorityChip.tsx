import {
  ChipProps,
  Chip,
  ErrorIcon,
  WarningIcon,
} from '@pluralsh/design-system'
import { ComponentProps, ReactElement } from 'react'
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

const priorityToIcon = {
  [NotificationPriority.Low]: undefined,
  [NotificationPriority.Medium]: <WarningIcon />,
  [NotificationPriority.High]: <ErrorIcon />,
} as const satisfies Record<NotificationPriority, ReactElement | undefined>

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
      fillLevel={3}
      icon={priorityToIcon[priority]}
      severity={priorityToSeverity[priority]}
      {...props}
    >
      {capitalize(priority)}
    </Chip>
  )
}
