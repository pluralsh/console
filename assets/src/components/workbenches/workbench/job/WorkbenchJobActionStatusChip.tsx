import {
  Chip,
  FailedFilledIcon,
  SpinnerAlt,
  StatusIpIcon,
  StatusOkIcon,
  WarningIcon,
} from '@pluralsh/design-system'
import { WorkbenchJobActivityStatus } from 'generated/graphql'

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
        >
          Pending
        </Chip>
      )
    case WorkbenchJobActivityStatus.Running:
      return (
        <Chip
          fillLevel={2}
          icon={<SpinnerAlt />}
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
        >
          Succeeded
        </Chip>
      )
    case WorkbenchJobActivityStatus.Cancelled:
      return <Chip fillLevel={2}>Denied</Chip>
    default:
      return null
  }
}
