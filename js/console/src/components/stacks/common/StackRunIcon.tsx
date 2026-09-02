import {
  AppIcon,
  StackRunIcon as DefaultStackRunIcon,
  IconProps,
  StackRunCanceledIcon,
  StackRunPausedIcon,
  StackRunPendingIcon,
} from '@pluralsh/design-system'
import { ComponentPropsWithRef, ComponentType } from 'react'

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

const statusToColor = (status: StackStatus, deleting: boolean) => {
  switch (status) {
    case StackStatus.PendingApproval:
      return deleting ? 'icon-danger' : 'icon-default'
    default:
      return 'icon-default'
  }
}

export default function StackRunIcon({
  status,
  deleting = false,
  ...props
}: {
  status: StackStatus
  deleting?: boolean
} & ComponentPropsWithRef<typeof AppIcon>) {
  const Icon = statusToIcon[status]
  const color = statusToColor(status, deleting)

  return (
    <AppIcon
      size="xxsmall"
      {...props}
      icon={
        <Icon
          size={32}
          color={color}
        />
      }
    />
  )
}
