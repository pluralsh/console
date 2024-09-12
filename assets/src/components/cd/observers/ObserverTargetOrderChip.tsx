import { Chip } from '@pluralsh/design-system'
import { ComponentProps } from 'react'

import { ObserverTargetOrder } from '../../../generated/graphql'

const orderDisplayName = {
  [ObserverTargetOrder.Latest]: 'Latest',
  [ObserverTargetOrder.Semver]: 'SemVer',
} as const satisfies Record<ObserverTargetOrder, string>

export default function ObserverTargetOrderChip({
  order,
  ...props
}: {
  order: ObserverTargetOrder
} & ComponentProps<typeof Chip>) {
  if (!order) return null

  return (
    <Chip
      severity="info"
      {...props}
    >
      {orderDisplayName[order]}
    </Chip>
  )
}
