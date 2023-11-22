import { Chip } from '@pluralsh/design-system'
import { ServiceDeploymentStatus } from 'generated/graphql'
import { ComponentProps } from 'react'
import { createMapperWithFallback } from 'utils/mapping'

export const serviceStatusToLabel = createMapperWithFallback<
  ServiceDeploymentStatus,
  string
>(
  {
    FAILED: 'Failed',
    HEALTHY: 'Healthy',
    STALE: 'Stale',
    SYNCED: 'Synced',
  },
  'Unknown'
)

export const serviceStatusToSeverity = createMapperWithFallback<
  ServiceDeploymentStatus,
  ComponentProps<typeof Chip>['severity']
>(
  {
    FAILED: 'critical',
    HEALTHY: 'success',
    STALE: 'warning',
    SYNCED: 'info',
  },
  'neutral'
)

export function ServiceStatusChip({
  status,
  componentStatus,
  ...props
}: {
  status: ServiceDeploymentStatus | null | undefined
  componentStatus?: string | null | undefined
} & ComponentProps<typeof Chip>) {
  return (
    <Chip
      severity={serviceStatusToSeverity(status)}
      {...props}
    >
      {componentStatus && <>{componentStatus} </>}
      {serviceStatusToLabel(status)}
    </Chip>
  )
}
