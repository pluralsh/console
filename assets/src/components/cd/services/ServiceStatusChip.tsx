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
}: {
  status: ServiceDeploymentStatus | null | undefined
  componentStatus?: string | null | undefined
}) {
  return (
    <Chip severity={serviceStatusToSeverity(status)}>
      {componentStatus && <>{componentStatus} </>}
      {serviceStatusToLabel(status)}
    </Chip>
  )
}
