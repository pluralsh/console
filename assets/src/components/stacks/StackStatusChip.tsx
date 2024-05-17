import React from 'react'
import { CheckIcon, Chip, PauseIcon, Spinner } from '@pluralsh/design-system'

import { ChipProps } from '@pluralsh/design-system/dist/components/Chip'

export default function StackStatusChip({
  paused,
  deleting,
  ...props
}: {
  paused: boolean
  deleting: boolean
} & ChipProps) {
  return deleting ? (
    <Chip
      size="small"
      severity="danger"
      icon={<Spinner />}
      {...props}
    >
      Deleting
    </Chip>
  ) : paused ? (
    <Chip
      size="small"
      severity="warning"
      icon={<PauseIcon />}
      {...props}
    >
      Paused
    </Chip>
  ) : (
    <Chip
      size="small"
      severity="success"
      icon={<CheckIcon />}
      {...props}
    >
      Active
    </Chip>
  )
}
