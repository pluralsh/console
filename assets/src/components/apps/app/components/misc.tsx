import { Readiness, ReadinessT } from 'utils/status'
import {
  BriefcaseIcon,
  CertificateIcon,
  Chip,
  DeploymentIcon,
  HelpIcon,
  HistoryIcon,
  NetworkInIcon,
  NetworkInterfaceIcon,
  VolumesIcon,
} from '@pluralsh/design-system'
import { ComponentState } from 'generated/graphql'
import { ComponentProps } from 'react'
import { useTheme } from 'styled-components'

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
} as const satisfies Record<ReadinessT, ComponentProps<typeof Chip>['severity']>

const statusToDisplay = {
  [Readiness.Ready]: 'Ready',
  [Readiness.InProgress]: 'In progress',
  [Readiness.Failed]: 'Failed',
  [Readiness.Complete]: 'Complete',
} as const satisfies Record<ReadinessT, string>

const stateToDisplay = {
  [ComponentState.Running]: 'Running',
  [ComponentState.Pending]: 'In progress',
  [ComponentState.Failed]: 'Failed',
} as const satisfies Record<ComponentState, string>

const stateToSeverity = {
  [ComponentState.Running]: 'success',
  [ComponentState.Pending]: 'warning',
  [ComponentState.Failed]: 'error',
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
}: {
  className?: string
  state?: ComponentState | null | undefined
}) {
  if (!state) {
    return null
  }

  return (
    <div className={className}>
      <Chip
        size="small"
        severity={stateToSeverity[state]}
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
  kind: string | undefined
  size?: number | undefined
}) {
  const theme = useTheme()

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
      return (
        <HelpIcon
          size={size}
          color={theme.colors['icon-disabled']}
        />
      )
  }
}
