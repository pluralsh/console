import { Readiness, ReadinessT } from 'utils/status'
import {
  BriefcaseIcon,
  CertificateIcon,
  Chip,
  ComponentsIcon,
  DeploymentIcon,
  HistoryIcon,
  NetworkInIcon,
  NetworkInterfaceIcon,
  PadlockLockedIcon,
  VolumesIcon,
  ChipProps,
} from '@pluralsh/design-system'
import { ComponentState } from 'generated/graphql'
import { ComponentProps } from 'react'

export const statusToSeverity = {
  [Readiness.Ready]: 'success',
  [Readiness.Running]: 'success',
  [Readiness.InProgress]: 'warning',
  [Readiness.Failed]: 'danger',
  [Readiness.Complete]: 'success',
  [Readiness.Completed]: 'success',
} as const satisfies Record<ReadinessT, ComponentProps<typeof Chip>['severity']>

const statusToDisplay = {
  [Readiness.Ready]: 'Ready',
  [Readiness.Running]: 'Ready',
  [Readiness.InProgress]: 'In progress',
  [Readiness.Failed]: 'Failed',
  [Readiness.Complete]: 'Complete',
  [Readiness.Completed]: 'Complete',
} as const satisfies Record<ReadinessT, string>

export const stateToDisplay = {
  [ComponentState.Running]: 'Running',
  [ComponentState.Pending]: 'In progress',
  [ComponentState.Failed]: 'Failed',
  [ComponentState.Paused]: 'Paused',
} as const satisfies Record<ComponentState, string>

const stateToSeverity = {
  [ComponentState.Running]: 'success',
  [ComponentState.Pending]: 'warning',
  [ComponentState.Failed]: 'danger',
  [ComponentState.Paused]: 'info',
} as const satisfies Record<
  ComponentState,
  ComponentProps<typeof Chip>['severity']
>

export function ComponentStatusChip({
  status,
  className,
}: {
  className?: string
  status?: string | null
}) {
  if (!status) {
    status = Readiness.InProgress
  }

  return (
    <div className={className}>
      <Chip
        size="small"
        severity={statusToSeverity[status]}
      >
        {statusToDisplay[status]}
      </Chip>
    </div>
  )
}

export function ComponentStateChip({
  state,
  className,
  ...props
}: {
  className?: string
  state?: ComponentState | null | undefined
} & ChipProps) {
  if (!state) {
    return null
  }

  return (
    <div className={className}>
      <Chip
        size="small"
        severity={stateToSeverity[state]}
        {...props}
      >
        {stateToDisplay[state]}
      </Chip>
    </div>
  )
}

export function ComponentIcon({
  kind,
  size,
}: {
  kind:
    | 'service'
    | 'deployment'
    | 'statefulset'
    | 'ingress'
    | 'cronjob'
    | 'job'
    | 'certificate'
    | 'secret'
    // `& {}` is hack to still show autocomplete for above options
    | (string & {})
  size?: number | undefined
}) {
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
    case 'secret':
      return <PadlockLockedIcon size={size} />
    default:
      return <ComponentsIcon size={size} />
  }
}
