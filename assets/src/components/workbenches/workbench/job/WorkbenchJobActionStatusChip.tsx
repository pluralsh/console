import {
  Chip,
  FailedFilledIcon,
  SpinnerAlt,
  StatusIpIcon,
  StatusOkIcon,
  WarningIcon,
} from '@pluralsh/design-system'
import { WorkbenchJobActivityStatus } from 'generated/graphql'
import { ComponentProps } from 'react'

const chipCss = {
  flexShrink: 0,
  whiteSpace: 'nowrap',
  '& .children': { whiteSpace: 'nowrap' },
} as const satisfies ComponentProps<typeof Chip>['css']

export function WorkbenchJobActionStatusChip({
  status,
}: {
  status: Nullable<WorkbenchJobActivityStatus>
}) {
  switch (status) {
    case WorkbenchJobActivityStatus.NeedsApproval:
      return (
        <Chip
          fillLevel={2}
          iconColor="icon-warning"
          icon={<WarningIcon />}
          css={chipCss}
        >
          Pending approval
        </Chip>
      )
    case WorkbenchJobActivityStatus.Pending:
      return (
        <Chip
          fillLevel={2}
          iconColor="icon-light"
          icon={<StatusIpIcon />}
          css={chipCss}
        >
          Pending
        </Chip>
      )
    case WorkbenchJobActivityStatus.Running:
      return (
        <Chip
          fillLevel={2}
          icon={<SpinnerAlt />}
          css={chipCss}
        >
          Running
        </Chip>
      )
    case WorkbenchJobActivityStatus.Failed:
      return (
        <Chip
          fillLevel={2}
          iconColor="icon-danger"
          icon={<FailedFilledIcon />}
          css={chipCss}
        >
          Failed
        </Chip>
      )
    case WorkbenchJobActivityStatus.Successful:
      return (
        <Chip
          fillLevel={2}
          iconColor="icon-success"
          icon={<StatusOkIcon />}
          css={chipCss}
        >
          Succeeded
        </Chip>
      )
    case WorkbenchJobActivityStatus.Cancelled:
    case WorkbenchJobActivityStatus.Rejected:
      return (
        <Chip
          fillLevel={2}
          css={chipCss}
        >
          Denied
        </Chip>
      )
    default:
      return null
  }
}
