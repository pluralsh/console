import { Chip, Tooltip } from '@pluralsh/design-system'
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
  const chip = (
    <Chip severity={gitHealthToSeverity(health)}>
      {gitHealthToLabel(health)}
    </Chip>
  )

  const errorLines = (error || '').split('\n').map((line, i, arr) => (
    <>
      {line}
      {i !== arr.length - 1 && <br />}
    </>
  ))

  if (error) {
    return (
      <Tooltip
        placement="top"
        label={<div css={{ maxWidth: 500 }}>{errorLines}</div>}
      >
        {chip}
      </Tooltip>
    )
  }

  return chip
}
