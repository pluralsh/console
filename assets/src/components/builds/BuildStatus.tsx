import { Chip } from '@pluralsh/design-system'

import { BuildStatus as Status } from '../types'

export default function BuildStatus({ status }) {
  switch (status) {
  case Status.QUEUED:
    return <Chip>Queued</Chip>
  case Status.CANCELLED:
    return <Chip>Cancelled</Chip>
  case Status.RUNNING:
    return <Chip severity="success">Running</Chip>
  case Status.FAILED:
    return <Chip severity="error">Error</Chip>
  case Status.SUCCESSFUL:
    return <Chip severity="success">Success</Chip>
  case Status.PENDING:
    return <Chip>Pending</Chip>
  default:
    return <Chip>Unknown</Chip>
  }
}
