import { ComponentProps } from 'react'
import { Chip } from '@pluralsh/design-system'
import capitalize from 'lodash/capitalize'

import { ObserverStatus } from '../../../generated/graphql'

const statusToSeverity = {
  [ObserverStatus.Healthy]: 'success',
  [ObserverStatus.Failed]: 'danger',
} as const satisfies Record<
  ObserverStatus,
  ComponentProps<typeof Chip>['severity']
>

export default function ObserverStatusChip({
  status,
}: {
  status?: ObserverStatus
}) {
  if (!status) return null

  return <Chip severity={statusToSeverity[status]}>{capitalize(status)}</Chip>
}
