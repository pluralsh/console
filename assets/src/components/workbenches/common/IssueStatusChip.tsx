import {
  CancelledFilledIcon,
  Chip,
  CircleDashIcon,
  Flex,
} from '@pluralsh/design-system'
import { IssueStatus } from 'generated/graphql'
import { startCase } from 'lodash'
import { ReactNode } from 'react'
import { useTheme } from 'styled-components'

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

const completedStatuses = new Set([
  IssueStatus.Completed,
  IssueStatus.Cancelled,
])

export function IssueStatusChip({ status }: { status: IssueStatus }) {
  const theme = useTheme()

  return (
    <Chip
      size="small"
      severity="neutral"
    >
      <Flex
        gap="xsmall"
        align="center"
      >
        {statusToChipIcon[status]}
        <span
          css={
            completedStatuses.has(status)
              ? { color: theme.colors['text-light'] }
              : undefined
          }
        >
          {startCase(status.toLowerCase())}
        </span>
      </Flex>
    </Chip>
  )
}
