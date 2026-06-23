import {
  CancelledFilledIcon,
  Chip,
  ChipProps,
  FailedFilledIcon,
  Flex,
  SpinnerAlt,
  SuccessIcon,
  WarningOutlineIcon,
} from '@pluralsh/design-system'
import { AgentRunStatus } from 'generated/graphql'
import { capitalize } from 'lodash'

export function AgentRunStatusChip({
  status,
  runningText = 'Running',
  ...props
}: {
  status: AgentRunStatus
  runningText?: string
} & ChipProps) {
  const isRunning = status === AgentRunStatus.Running
  const isActive =
    isRunning ||
    status === AgentRunStatus.Pending ||
    status === AgentRunStatus.Babysitting

  return (
    <Chip
      fillLevel={isActive ? 2 : 1}
      severity="neutral"
      {...props}
    >
      <Flex
        gap="xsmall"
        align="center"
      >
        <AgentRunStatusChipIcon status={status} />
        <span>{isRunning ? runningText : agentRunStatusLabel(status)}</span>
      </Flex>
    </Chip>
  )
}

function AgentRunStatusChipIcon({
  status,
  size = 13,
}: {
  status: AgentRunStatus
  size?: number
}) {
  switch (status) {
    case AgentRunStatus.Successful:
      return (
        <SuccessIcon
          color="icon-success"
          size={size}
        />
      )
    case AgentRunStatus.Failed:
      return (
        <FailedFilledIcon
          color="icon-danger"
          size={size}
        />
      )
    case AgentRunStatus.Running:
    case AgentRunStatus.Pending:
    case AgentRunStatus.Babysitting:
      return <SpinnerAlt size={size} />
    case AgentRunStatus.PendingApproval:
      return (
        <WarningOutlineIcon
          color="icon-warning"
          size={size}
        />
      )
    case AgentRunStatus.Cancelled:
      return (
        <CancelledFilledIcon
          color="icon-xlight"
          size={size}
        />
      )
  }
}

function agentRunStatusLabel(status: AgentRunStatus) {
  if (status === AgentRunStatus.PendingApproval) return 'Pending approval'
  if (status === AgentRunStatus.Successful) return 'Successful'

  return capitalize(status).replaceAll('_', ' ')
}
