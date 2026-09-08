import { Chip } from '@pluralsh/design-system'
import { ComponentProps } from 'react'

import { ObserverTargetType } from '../../../generated/graphql'

const targetDisplayName = {
  [ObserverTargetType.Git]: 'Git',
  [ObserverTargetType.Helm]: 'Helm',
  [ObserverTargetType.Oci]: 'OCI',
  [ObserverTargetType.EksAddon]: 'EKS Addon',
  [ObserverTargetType.Addon]: 'Addon',
} as const satisfies Record<ObserverTargetType, string>

export default function ObserverTargetChip({
  target,
  ...props
}: {
  target?: ObserverTargetType
} & ComponentProps<typeof Chip>) {
  if (!target) return null

  return (
    <Chip
      severity="info"
      {...props}
    >
      {targetDisplayName[target]}
    </Chip>
  )
}
