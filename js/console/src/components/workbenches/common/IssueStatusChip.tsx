import {
  CancelledFilledIcon,
  CheckOutlineIcon,
  Chip,
  ChipProps,
  CircleDashIcon,
  Flex,
  IconFrame,
} from '@pluralsh/design-system'
import { IssueStatus } from 'generated/graphql'
import { includes } from 'lodash'
import { ReactElement, ReactNode } from 'react'
import { useTheme } from 'styled-components'
import { ISSUE_STATUS_LABELS } from './issueStatus'

const COMPLETED_STATUSES = [IssueStatus.Completed, IssueStatus.Cancelled]

const statusToChipIcon: Partial<Record<IssueStatus, ReactNode>> = {
  [IssueStatus.InProgress]: (
    <CircleDashIcon
      size={12}
      color="icon-light"
    />
  ),
  [IssueStatus.Cancelled]: (
    <CancelledFilledIcon
      size={12}
      color="icon-xlight"
    />
  ),
}

export function IssueStatusChip({
  status,
  ...props
}: {
  status: IssueStatus
} & ChipProps) {
  const theme = useTheme()

  return (
    <Chip
      size="small"
      severity="neutral"
      {...props}
    >
      <Flex
        gap="xsmall"
        align="center"
      >
        {statusToChipIcon[status]}
        <span
          css={{
            whiteSpace: 'nowrap',
            ...(includes(COMPLETED_STATUSES, status)
              ? { color: theme.colors['text-light'] }
              : {}),
          }}
        >
          {ISSUE_STATUS_LABELS[status]}
        </span>
      </Flex>
    </Chip>
  )
}

const statusToIcon: Record<IssueStatus, ReactElement> = {
  [IssueStatus.Open]: <CircleDashIcon color="icon-xlight" />,
  [IssueStatus.InProgress]: <CircleDashIcon color="icon-light" />,
  [IssueStatus.Completed]: <CheckOutlineIcon color="icon-light" />,
  [IssueStatus.Cancelled]: <CancelledFilledIcon color="icon-xlight" />,
}

// Status as a bare icon with a tooltip, for dense lists.
export function IssueStatusIcon({ status }: { status: IssueStatus }) {
  return (
    <IconFrame
      type="tertiary"
      size="medium"
      textValue={ISSUE_STATUS_LABELS[status]}
      tooltip={ISSUE_STATUS_LABELS[status]}
      icon={statusToIcon[status]}
    />
  )
}
