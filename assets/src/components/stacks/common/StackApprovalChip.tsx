import {
  CheckRoundedIcon,
  Chip,
  ChipProps,
  ErrorIcon,
  IndeterminateIcon,
  SemanticColorKey,
} from '@pluralsh/design-system'
import { ApprovalResult } from 'generated/graphql'
import { capitalize } from 'lodash'
import { ReactElement } from 'react'

export function StackApprovalChip({
  approval,
  ...props
}: {
  approval: boolean
} & ChipProps) {
  return approval ? (
    <Chip {...props}>Required</Chip>
  ) : (
    <Chip {...props}>Not required</Chip>
  )
}

export function StackAIApprovalChip({
  approvalResult,
}: {
  approvalResult: ApprovalResult
}) {
  const { icon, color } = approvalResultToIcon[approvalResult]
  return (
    <Chip
      icon={icon}
      iconColor={color}
    >
      {capitalize(approvalResult)}
    </Chip>
  )
}

const approvalResultToIcon: Record<
  ApprovalResult,
  { icon: ReactElement; color: SemanticColorKey }
> = {
  [ApprovalResult.Approved]: {
    icon: <CheckRoundedIcon />,
    color: 'icon-success',
  },
  [ApprovalResult.Indeterminate]: {
    icon: <IndeterminateIcon color="icon-primary" />,
    color: 'icon-primary',
  },
  [ApprovalResult.Rejected]: {
    icon: <ErrorIcon color="icon-danger" />,
    color: 'icon-danger',
  },
}
