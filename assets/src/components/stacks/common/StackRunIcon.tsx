import React from 'react'
import { AppIcon, CliIcon, WarningShieldIcon } from '@pluralsh/design-system'

import { ChipProps } from '@pluralsh/design-system/dist/components/Chip'

import { StackStatus } from '../../../generated/graphql'

export default function StackRunIcon({
  status,
}: {
  status: StackStatus
} & ChipProps) {
  return (
    <AppIcon
      size="xxsmall"
      icon={
        status === StackStatus.PendingApproval ? (
          <WarningShieldIcon
            width={32}
            color="icon-warning"
          />
        ) : (
          <CliIcon width={32} />
        )
      }
    />
  )
}
