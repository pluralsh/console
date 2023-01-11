import { Readiness, ReadinessT } from 'utils/status'
import {
  BriefcaseIcon,
  CertificateIcon,
  Chip,
  DeploymentIcon,
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
} as const satisfies Record<ReadinessT, string>

export const statusToSeverity = {
  [Readiness.Ready]: 'success',
  [Readiness.InProgress]: 'warning',
  [Readiness.Failed]: 'error',
  [Readiness.Complete]: 'success',
} as const satisfies Record<ReadinessT, string>

const statusToDisplay = {
  [Readiness.Ready]: 'Ready',
  [Readiness.InProgress]: 'In progress',
  [Readiness.Failed]: 'Failed',
  [Readiness.Complete]: 'Complete',
} as const satisfies Record<ReadinessT, string>

export function ComponentStatus({ status }: { status?: string | null }) {
  if (!status) {
    status = Readiness.InProgress
  }

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
  case 'job':
    return <BriefcaseIcon size={size} />
  case 'certificate':
    return <CertificateIcon size={size} />
  default:
    return null
  }
}
