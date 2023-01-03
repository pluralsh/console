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

export function ComponentIcon({ kind, size }: {kind: string | undefined, size?: number | undefined}) {
  switch (kind?.toLowerCase()) {
  case 'service':
    return <NetworkInterfaceIcon size={size} />
  case 'deployment':
    return <DeploymentIcon size={size} />
  case 'statefulset':
    return <VolumesIcon size={size} />
  case 'ingress':
    return <NetworkInIcon size={size} />
  case 'cronjob':
    return <HistoryIcon size={size} />
  case 'pod':
    return <ErrorIcon size={size} /> // TODO: Pod icon.
  case 'job':
    return <ErrorIcon size={size} /> // TODO: Briefcase icon.
  case 'certificate':
    return <CertificateIcon size={size} />
  default:
    return null
  }
}
