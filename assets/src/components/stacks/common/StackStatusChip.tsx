import React from 'react'
import { Chip } from '@pluralsh/design-system'

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
      severity="danger"
      {...props}
    >
      Deleting
    </Chip>
  ) : paused ? (
    <Chip
      severity="warning"
      {...props}
    >
      Paused
    </Chip>
  ) : (
    <Chip
      severity="info"
      {...props}
    >
      Active
    </Chip>
  )
}
