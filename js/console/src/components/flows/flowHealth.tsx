import { Chip, ChipSeverity } from '@pluralsh/design-system'
import { ComponentState, ComponentStatusCount } from 'generated/graphql'
import { compact, sumBy } from 'lodash'
import pluralize from 'pluralize'
import { CaptionP } from 'components/utils/typography/Text'
import styled from 'styled-components'

export type HealthBucket = 'failed' | 'stale' | 'healthy'

const BUCKET_SEVERITY: Record<HealthBucket, ChipSeverity> = {
  failed: 'danger',
  stale: 'warning',
  healthy: 'success',
}

const BUCKET_PRIORITY: HealthBucket[] = ['failed', 'stale', 'healthy']

export function componentHealthCounts(
  statuses: Nullable<Nullable<ComponentStatusCount>[]> | undefined
): Record<HealthBucket, number> {
  const rows = compact(statuses)

  return {
    failed: sumBy(
      rows.filter((row) => row.state === ComponentState.Failed),
      'count'
    ),
    stale: sumBy(
      rows.filter(
        (row) =>
          row.state === ComponentState.Pending ||
          row.state === ComponentState.Paused
      ),
      'count'
    ),
    healthy: sumBy(
      rows.filter((row) => row.state === ComponentState.Running),
      'count'
    ),
  }
}

export function worstHealth(
  counts: Record<HealthBucket, number>
): HealthBucket | null {
  return BUCKET_PRIORITY.find((bucket) => counts[bucket] > 0) ?? null
}

export function healthCaption(counts: Record<HealthBucket, number>) {
  return BUCKET_PRIORITY.filter((bucket) => counts[bucket] > 0)
    .map((bucket) => `${counts[bucket]} ${bucketLabel(bucket, counts[bucket])}`)
    .join(' · ')
}

function bucketLabel(bucket: HealthBucket, count: number) {
  if (bucket === 'stale') return pluralize('stale', count)
  if (bucket === 'failed') return pluralize('failed', count)
  return pluralize('healthy', count)
}

export function FlowHealthChips({
  counts,
}: {
  counts: Record<HealthBucket, number>
}) {
  return (
    <ChipsSC>
      {BUCKET_PRIORITY.filter((bucket) => counts[bucket] > 0).map((bucket) => (
        <Chip
          key={bucket}
          size="small"
          severity={BUCKET_SEVERITY[bucket]}
        >
          {counts[bucket]} {bucketLabel(bucket, counts[bucket])}
        </Chip>
      ))}
    </ChipsSC>
  )
}

export function FlowHealthStacked({
  counts,
}: {
  counts: Record<HealthBucket, number>
}) {
  const worst = worstHealth(counts)
  const caption = healthCaption(counts)

  if (!worst || !caption) return null

  return (
    <StackedSC>
      <CaptionP
        $color={
          worst === 'failed'
            ? 'text-danger-light'
            : worst === 'stale'
              ? 'text-warning-light'
              : 'text-success-light'
        }
        css={{ margin: 0, textTransform: 'capitalize' }}
      >
        {worst}
      </CaptionP>
      <CaptionP
        $color="text-xlight"
        css={{ margin: 0 }}
      >
        {caption}
      </CaptionP>
    </StackedSC>
  )
}

export function FlowPipelineChip({
  pipelineCount,
  pendingCount,
}: {
  pipelineCount: number
  pendingCount: number
}) {
  if (pipelineCount <= 0 && pendingCount <= 0) return null

  return (
    <Chip
      size="small"
      severity={pendingCount > 0 ? 'warning' : 'neutral'}
    >
      {pipelineCount > 0 && (
        <span>
          {pipelineCount} {pluralize('pipeline', pipelineCount)}
        </span>
      )}
      {pendingCount > 0 && <PendingSC>{pendingCount} pending</PendingSC>}
    </Chip>
  )
}

const ChipsSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.xxsmall,
}))

const StackedSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
})

const PendingSC = styled.span(({ theme }) => ({
  marginLeft: theme.spacing.xsmall,
  color: theme.colors['text-warning-light'],
}))
