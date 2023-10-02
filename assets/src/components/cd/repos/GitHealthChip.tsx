import { Chip } from '@pluralsh/design-system'
import { GitHealth } from 'generated/graphql'
import { ComponentProps } from 'react'
import { createMapperWithFallback } from 'utils/mapping'

export const gitHealthToLabel = createMapperWithFallback<GitHealth, string>(
  {
    PULLABLE: 'Pullable',
    FAILED: 'Failed',
  },
  'Unknown'
)

export const gitHealthToSeverity = createMapperWithFallback<
  GitHealth,
  ComponentProps<typeof Chip>['severity']
>(
  {
    PULLABLE: 'success',
    FAILED: 'critical',
  },
  'neutral'
)

export function GitHealthChip({
  health,
  error,
}: {
  health: GitHealth | null | undefined
  error?: string | null | undefined
}) {
  return (
    <Chip
      tooltip={error || undefined}
      severity={gitHealthToSeverity(health)}
    >
      {gitHealthToLabel(health)}
    </Chip>
  )
}
