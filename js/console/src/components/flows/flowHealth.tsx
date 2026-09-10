import { Chip, ChipProps, SemanticColorKey } from '@pluralsh/design-system'
import { StackedText } from 'components/utils/table/StackedText'
import { CaptionP } from 'components/utils/typography/Text'
import {
  ComponentState,
  ComponentStatusCount,
  ServiceDeploymentStatus,
} from 'generated/graphql'
import { compact, startCase } from 'lodash'
import pluralize from 'pluralize'
import { MouseEvent, ReactNode, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFlowDetailsPath } from 'routes/flowRoutesConsts'
import styled from 'styled-components'

export type HealthBucket = 'failed' | 'stale' | 'healthy'

export type FlowTab = 'services' | 'alerts' | 'pipelines'

export const FLOW_COMPONENT_PARAM = 'component'

const BUCKETS: HealthBucket[] = ['failed', 'stale', 'healthy']

const STATE_BUCKET: Partial<Record<ComponentState, HealthBucket>> = {
  [ComponentState.Failed]: 'failed',
  [ComponentState.Pending]: 'stale',
  [ComponentState.Paused]: 'stale',
  [ComponentState.Running]: 'healthy',
}

export const BUCKET_SEVERITY = {
  failed: 'danger',
  stale: 'warning',
  healthy: 'success',
} as const satisfies Record<HealthBucket, ChipProps['severity']>

const BUCKET_TEXT = {
  failed: 'text-danger-light',
  stale: 'text-warning-light',
  healthy: 'text-success-light',
} as const satisfies Record<HealthBucket, SemanticColorKey>

export const BUCKET_SERVICE_STATUSES: Record<
  HealthBucket,
  ServiceDeploymentStatus[]
> = {
  failed: [ServiceDeploymentStatus.Failed],
  stale: [ServiceDeploymentStatus.Stale, ServiceDeploymentStatus.Paused],
  healthy: [ServiceDeploymentStatus.Healthy, ServiceDeploymentStatus.Synced],
}

const chipCss = {
  width: 'max-content',
  flexShrink: 0,
  pointerEvents: 'auto',
} as const

export function componentHealthCounts(
  statuses: Nullable<Nullable<ComponentStatusCount>[]> | undefined
): Record<HealthBucket, number> {
  return compact(statuses).reduce(
    (counts, { state, count }) => {
      const bucket = state ? STATE_BUCKET[state] : undefined
      if (bucket) counts[bucket] += count
      return counts
    },
    { failed: 0, stale: 0, healthy: 0 }
  )
}

export function worstHealth(
  counts: Record<HealthBucket, number>
): HealthBucket | null {
  return BUCKETS.find((bucket) => counts[bucket] > 0) ?? null
}

export function parseComponentBucket(
  value: string | null | undefined
): HealthBucket | null {
  return BUCKETS.includes(value as HealthBucket)
    ? (value as HealthBucket)
    : null
}

export function flowTabPath(
  flowName: string,
  tab: FlowTab,
  search = '',
  component?: HealthBucket | null
) {
  const params = new URLSearchParams(search)

  if (component) params.set(FLOW_COMPONENT_PARAM, component)
  else params.delete(FLOW_COMPONENT_PARAM)

  const qs = params.toString()

  return `${getFlowDetailsPath({ flowIdOrName: flowName })}/${tab}${qs ? `?${qs}` : ''}`
}

function bucketPhrase(bucket: HealthBucket, count: number) {
  return `${count} ${bucket}`
}

function useStopNav(to?: string) {
  const navigate = useNavigate()

  return useCallback(
    (event: MouseEvent) => {
      if (!to) return
      event.preventDefault()
      event.stopPropagation()
      navigate(to)
    },
    [navigate, to]
  )
}

function FlowNavChip({
  to,
  inactive,
  severity,
  children,
  css: extraCss,
}: {
  to?: string
  inactive?: ChipProps['inactive']
  severity: ChipProps['severity']
  children: ReactNode
  css?: ChipProps['css']
}) {
  const onClick = useStopNav(to)

  return (
    <Chip
      size="small"
      fillLevel={1}
      severity={severity}
      inactive={inactive}
      clickable={!!to}
      css={{ ...chipCss, ...extraCss }}
      onClick={to ? onClick : undefined}
    >
      {children}
    </Chip>
  )
}

export function FlowHealthChips({
  counts,
  getTo,
}: {
  counts: Record<HealthBucket, number>
  getTo?: (bucket: HealthBucket) => string
}) {
  return (
    <ChipsSC>
      {BUCKETS.filter((bucket) => counts[bucket] > 0).map((bucket) => (
        <FlowNavChip
          key={bucket}
          severity={BUCKET_SEVERITY[bucket]}
          to={getTo?.(bucket)}
        >
          {bucketPhrase(bucket, counts[bucket])}
        </FlowNavChip>
      ))}
    </ChipsSC>
  )
}

export function FlowAlertChip({ count, to }: { count: number; to?: string }) {
  return (
    <FlowNavChip
      to={to}
      severity="danger"
      inactive={count === 0 ? 'keep-fill' : false}
    >
      {count} {pluralize('alert', count)}
    </FlowNavChip>
  )
}

export function FlowPipelineChip({
  pipelineCount,
  pendingCount,
  stoppedCount = 0,
  to,
}: {
  pipelineCount: number
  pendingCount: number
  stoppedCount?: number
  to?: string
}) {
  const pending = pendingCount > 0
  const stopped = stoppedCount > 0

  return (
    <FlowNavChip
      to={to}
      severity="neutral"
      inactive={
        !pending && !stopped && pipelineCount === 0 ? 'keep-fill' : false
      }
      css={{ '& .children': { gap: 4 } }}
    >
      {pending && (
        <PipelineStatusSC $tone="pending">
          {pendingCount} pending
        </PipelineStatusSC>
      )}
      {stopped && (
        <PipelineStatusSC $tone="stopped">
          {stoppedCount} stopped
        </PipelineStatusSC>
      )}
      {!pending &&
        !stopped &&
        `${pipelineCount} ${pluralize('pipeline', pipelineCount)}`}
    </FlowNavChip>
  )
}

export function FlowHealthStacked({
  counts,
  to,
}: {
  counts: Record<HealthBucket, number>
  to?: string
}) {
  const onClick = useStopNav(to)
  const worst = worstHealth(counts)
  const caption = BUCKETS.filter((bucket) => counts[bucket] > 0)
    .map((bucket) => bucketPhrase(bucket, counts[bucket]))
    .join(' · ')

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

  const stacked = (
    <StackedText
      first={startCase(worst)}
      second={caption}
      firstPartialType="caption"
      secondPartialType="caption"
      firstColor={BUCKET_TEXT[worst]}
    />
  )

  if (!to) return stacked

  return (
    <StackedButtonSC
      type="button"
      onClick={onClick}
    >
      {stacked}
    </StackedButtonSC>
  )
}

const PipelineStatusSC = styled.span<{ $tone: 'pending' | 'stopped' }>(
  ({ theme, $tone }) => ({
    color:
      $tone === 'pending'
        ? theme.colors['text-warning-light']
        : theme.colors['text-danger-light'],
  })
)

const ChipsSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.xxsmall,
}))

const StackedButtonSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  pointerEvents: 'auto',
  textAlign: 'left',
  cursor: 'pointer',
  '&:hover': {
    textDecoration: 'underline',
  },
}))
