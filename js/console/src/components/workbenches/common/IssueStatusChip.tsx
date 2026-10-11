import { Chip, ChipProps, Flex, IconFrame } from '@pluralsh/design-system'
import { IssueStatus } from 'generated/graphql'
import { includes } from 'lodash'
import { useTheme } from 'styled-components'
import { ISSUE_STATUS_LABELS } from './issueStatus'
import { IssueStatusGlyph } from './IssueStatusGlyph'

const COMPLETED_STATUSES = [IssueStatus.Completed, IssueStatus.Cancelled]

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
        <IssueStatusGlyph
          status={status}
          size={12}
        />
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

// Status as a bare icon with a tooltip, for dense lists.
export function IssueStatusIcon({ status }: { status: IssueStatus }) {
  return (
    <IconFrame
      type="tertiary"
      size="small"
      textValue={ISSUE_STATUS_LABELS[status]}
      tooltip={ISSUE_STATUS_LABELS[status]}
      icon={<IssueStatusGlyph status={status} />}
    />
  )
}
