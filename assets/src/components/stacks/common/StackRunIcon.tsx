import { ComponentType } from 'react'
import {
  AppIcon,
  StackRunIcon as DefaultStackRunIcon,
  StackRunCanceledIcon,
  StackRunPausedIcon,
  StackRunPendingIcon,
} from '@pluralsh/design-system'

import { ChipProps } from '@pluralsh/design-system/dist/components/Chip'

import { IconProps } from '@pluralsh/design-system/dist/components/icons/createIcon'

import { StackStatus } from '../../../generated/graphql'

const statusToIcon = {
  [StackStatus.Queued]: StackRunPausedIcon,
  [StackStatus.Running]: DefaultStackRunIcon,
  [StackStatus.Pending]: DefaultStackRunIcon,
  [StackStatus.Cancelled]: StackRunCanceledIcon,
  [StackStatus.Failed]: StackRunCanceledIcon,
  [StackStatus.Successful]: DefaultStackRunIcon,
  [StackStatus.PendingApproval]: StackRunPendingIcon,
} as const satisfies Record<StackStatus, ComponentType<IconProps>>

export default function StackRunIcon({
  status,
}: {
  status: StackStatus
} & ChipProps) {
  const Icon = statusToIcon[status]

  return (
    <AppIcon
      size="xxsmall"
      icon={<Icon size={32} />}
    />
  )
}
