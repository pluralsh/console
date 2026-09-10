import { Chip, ChipSeverity } from '@pluralsh/design-system'
import { CaptionP } from 'components/utils/typography/Text'
import {
  ComponentState,
  ComponentStatusCount,
  ServiceDeploymentStatus,
} from 'generated/graphql'
import { compact, sumBy } from 'lodash'
import pluralize from 'pluralize'
import { MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFlowDetailsPath } from 'routes/flowRoutesConsts'
import styled from 'styled-components'

export type HealthBucket = 'failed' | 'stale' | 'healthy'

export const FLOW_COMPONENT_PARAM = 'component'

export const BUCKET_SEVERITY: Record<HealthBucket, ChipSeverity> = {
  failed: 'danger',
  stale: 'warning',
  healthy: 'success',
}

const BUCKET_PRIORITY: HealthBucket[] = ['failed', 'stale', 'healthy']

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

export function parseComponentBucket(
  value: string | null | undefined
): HealthBucket | null {
  if (value === 'failed' || value === 'stale' || value === 'healthy') {
    return value
  }

  return null
}

export function getFlowTabPath({
  flowName,
  tab,
  search,
  component,
}: {
  flowName: string
  tab: 'services' | 'alerts' | 'pipelines'
  search?: string
  component?: HealthBucket
}) {
  const params = new URLSearchParams(search)

  if (component) params.set(FLOW_COMPONENT_PARAM, component)
  else params.delete(FLOW_COMPONENT_PARAM)

  const qs = params.toString()

  return `${getFlowDetailsPath({ flowIdOrName: flowName })}/${tab}${qs ? `?${qs}` : ''}`
}

function bucketLabel(bucket: HealthBucket, count: number) {
  if (bucket === 'stale') return pluralize('stale', count)
  if (bucket === 'failed') return pluralize('failed', count)
  return pluralize('healthy', count)
}

function onChipClick(
  event: MouseEvent,
  navigate: (to: string) => void,
  to: string
) {
  event.preventDefault()
  event.stopPropagation()
  navigate(to)
}

export function FlowHealthChips({
  counts,
  getTo,
}: {
  counts: Record<HealthBucket, number>
  getTo?: (bucket: HealthBucket) => string
}) {
  const navigate = useNavigate()

  return (
    <ChipsSC>
      {BUCKET_PRIORITY.filter((bucket) => counts[bucket] > 0).map((bucket) => {
        const to = getTo?.(bucket)

        return (
          <Chip
            key={bucket}
            size="small"
            rounded
            fillLevel={1}
            severity={BUCKET_SEVERITY[bucket]}
            clickable={!!to}
            css={chipCss}
            onClick={
              to ? (event) => onChipClick(event, navigate, to) : undefined
            }
          >
            {counts[bucket]} {bucketLabel(bucket, counts[bucket])}
          </Chip>
        )
      })}
    </ChipsSC>
  )
}

export function FlowAlertChip({
  count,
  to,
}: {
  count: number
  to?: string
}) {
  const navigate = useNavigate()

  return (
    <Chip
      size="small"
      rounded
      fillLevel={1}
      severity="danger"
      inactive={count === 0 ? 'keep-fill' : false}
      clickable={!!to}
      css={chipCss}
      onClick={
        to ? (event) => onChipClick(event, navigate, to) : undefined
      }
    >
      {count} {pluralize('alert', count)}
    </Chip>
  )
}

export function FlowHealthStacked({
  counts,
  to,
}: {
  counts: Record<HealthBucket, number>
  to?: string
}) {
  const navigate = useNavigate()
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

  const stacked = (
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

  if (!to) return stacked

  return (
    <StackedButtonSC
      type="button"
      onClick={(event) => onChipClick(event, navigate, to)}
    >
      {stacked}
    </StackedButtonSC>
  )
}

export function FlowPipelineChip({
  pipelineCount,
  pendingCount,
  to,
}: {
  pipelineCount: number
  pendingCount: number
  to?: string
}) {
  const navigate = useNavigate()

  return (
    <Chip
      size="small"
      rounded
      fillLevel={1}
      severity={pendingCount > 0 ? 'warning' : 'neutral'}
      inactive={pipelineCount === 0 && pendingCount === 0 ? 'keep-fill' : false}
      clickable={!!to}
      css={chipCss}
      onClick={
        to ? (event) => onChipClick(event, navigate, to) : undefined
      }
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

const StackedButtonSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  pointerEvents: 'auto',
  textAlign: 'left',
  cursor: 'pointer',
  '&:hover p': {
    textDecoration: 'underline',
  },
}))

const PendingSC = styled.span(({ theme }) => ({
  marginLeft: theme.spacing.xsmall,
  color: theme.colors['text-warning-light'],
}))
