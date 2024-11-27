import { Chip, ChipProps } from '@pluralsh/design-system'

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
