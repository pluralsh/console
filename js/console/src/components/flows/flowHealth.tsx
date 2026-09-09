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
          rounded
          fillLevel={1}
          severity={BUCKET_SEVERITY[bucket]}
          css={{ width: 'max-content', flexShrink: 0 }}
        >
          {counts[bucket]} {bucketLabel(bucket, counts[bucket])}
        </Chip>
      ))}
    </ChipsSC>
  )
}

export function FlowAlertChip({ count }: { count: number }) {
  return (
    <Chip
      size="small"
      rounded
      fillLevel={1}
      severity="danger"
      inactive={count === 0 ? 'keep-fill' : false}
      css={{ width: 'max-content', flexShrink: 0 }}
    >
      {count} {pluralize('alert', count)}
    </Chip>
  )
}

export function FlowHealthStacked({
  counts,
}: {
  counts: Record<HealthBucket, number>
}) {
  const worst = worstHealth(counts)
  const caption = healthCaption(counts)

  if (!worst || !caption) {
    return (
      <CaptionP
        $color="text-xlight"
        css={{ margin: 0 }}
      >
        —
      </CaptionP>
    )
  }

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
  return (
    <Chip
      size="small"
      rounded
      fillLevel={1}
      severity={pendingCount > 0 ? 'warning' : 'neutral'}
      inactive={pipelineCount === 0 && pendingCount === 0 ? 'keep-fill' : false}
      css={{ width: 'max-content', flexShrink: 0 }}
    >
      {pipelineCount} {pluralize('pipeline', pipelineCount)}
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
