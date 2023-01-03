import { Readiness } from 'utils/status'
import {
  CertificateIcon,
  Chip,
  DeploymentIcon,
  ErrorIcon,
  HistoryIcon,
  NetworkInIcon,
  NetworkInterfaceIcon,
  VolumesIcon,
} from '@pluralsh/design-system'

export const statusToBorder = {
  [Readiness.Ready]: '',
  [Readiness.InProgress]: 'border-warning',
  [Readiness.Failed]: 'border-error',
  [Readiness.Complete]: '',
}

export const statusToSeverity = {
  [Readiness.Ready]: 'success',
  [Readiness.InProgress]: 'warning',
  [Readiness.Failed]: 'error',
  [Readiness.Complete]: 'success',
}

const statusToDisplay = {
  [Readiness.Ready]: 'Ready',
  [Readiness.InProgress]: 'In progress',
  [Readiness.Failed]: 'Failed',
  [Readiness.Complete]: 'Complete',
}

export function ComponentStatus({ status }: {status: string}) {
  return (
    <Chip
      size="small"
      severity={statusToSeverity[status]}
    >
      {statusToDisplay[status]}
    </Chip>
  )
}

export function ComponentIcon({ kind }: {kind: string}) {
  switch (kind.toLowerCase()) {
  case 'service':
    return <NetworkInterfaceIcon />
  case 'deployment':
    return <DeploymentIcon />
  case 'statefulset':
    return <VolumesIcon />
  case 'ingress':
    return <NetworkInIcon />
  case 'cronjob':
    return <HistoryIcon />
  case 'pod':
    return <ErrorIcon /> // TODO: Pod icon.
  case 'job':
    return <ErrorIcon /> // TODO: Briefcase icon.
  case 'certificate':
    return <CertificateIcon />
  default:
    return null
  }
}
