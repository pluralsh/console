import { Chip, Tooltip } from '@pluralsh/design-system'
import { GitHealth } from 'generated/graphql'
import { capitalize } from 'lodash'
import { ComponentProps } from 'react'
import { createMapperWithFallback } from 'utils/mapping'

export const gitHealthToSeverity = createMapperWithFallback<
  GitHealth,
  ComponentProps<typeof Chip>['severity']
>({ PULLABLE: 'success', FAILED: 'critical' }, 'neutral')

export function GitHealthChip({
  health,
  error,
}: {
  health: Nullable<GitHealth>
  error?: Nullable<string>
}) {
  const chip = (
    <Chip severity={gitHealthToSeverity(health)}>
      {capitalize(health ?? 'Unknown')}
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
