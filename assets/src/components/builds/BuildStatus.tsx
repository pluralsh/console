import { Chip } from '@pluralsh/design-system'

import { BuildStatus as Status } from '../types'

export default function BuildStatus({ status, ...props }) {
  switch (status) {
  case Status.QUEUED:
    return <Chip {...props}>Queued</Chip>
  case Status.CANCELLED:
    return <Chip {...props}>Cancelled</Chip>
  case Status.RUNNING:
    return (
      <Chip
        severity="info"
        {...props}
      >
        Running
      </Chip>
    )
  case Status.FAILED:
    return (
      <Chip
        severity="error"
        {...props}
      >
        Error
      </Chip>
    )
  case Status.SUCCESSFUL:
    return (
      <Chip
        severity="success"
        {...props}
      >
        Success
      </Chip>
    )
  case Status.PENDING:
    return <Chip {...props}>Pending Approval </Chip>
  default:
    return <Chip {...props}>Unknown</Chip>
  }
}
