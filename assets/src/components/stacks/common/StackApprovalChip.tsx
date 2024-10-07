import { Chip } from '@pluralsh/design-system'

import { ChipProps } from '@pluralsh/design-system/dist/components/Chip'

export default function StackApprovalChip({
  approval,
  ...props
}: {
  approval: boolean
} & ChipProps) {
  return approval ? (
    <Chip
      severity="warning"
      {...props}
    >
      Required
    </Chip>
  ) : (
    <Chip {...props}>Not required</Chip>
  )
}
