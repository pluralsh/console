import { Body1BoldP, Body2P, CaptionP } from 'components/utils/typography/Text'
import { WorkbenchJobActivityTraceFragment } from 'generated/graphql'
import { useKeyDown } from '@react-hooks-library/core'
import {
  Chip,
  CloseIcon,
  ErrorIcon,
  GraphIcon,
  IconFrame,
  LinkoutIcon,
  StatusOkIcon,
  TableIcon,
  TreeViewIcon,
  WarningIcon,
} from '@pluralsh/design-system'
import { type ReactNode, useMemo, useState } from 'react'
import FocusLock from 'react-focus-lock'
import styled from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import { TraceTopology } from './WorkbenchJobTraceTopology'
import { traceBarColor } from './workbenchJobTraceColors'

type TraceSpan = Pick<
  WorkbenchJobActivityTraceFragment,
  | 'end'
  | 'name'
  | 'parentId'
  | 'service'
  | 'spanId'
  | 'start'
  | 'tags'
  | 'traceId'
>

export type TraceRow = {
  depth: number
  end: number
  span: TraceSpan
  start: number
}

export type TraceTreeMeta = {
  ancestorContinues: boolean[]
  hasChildren: boolean
}

export function TraceWaterfall({
  traces,
  summary,
}: {
  traces: TraceSpan[]
  summary?: Nullable<string>
}) {
  const traceGroups = useMemo(() => groupTraces(traces), [traces])
  const [selectedTraceId, setSelectedTraceId] = useState<string>()
  const [view, setView] = useState<TraceView>('timeline')
  const [fullscreen, setFullscreen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(true)
  const activeTrace =
    traceGroups.find(({ id }) => id === selectedTraceId) ?? traceGroups[0]

  const rows = useMemo(
    () => orderTraceSpans(activeTrace?.spans ?? []),
    [activeTrace?.spans]
  )
  const tree = useMemo(() => traceTreeMeta(rows), [rows])
  const [selectedSpanId, setSelectedSpanId] = useState<string>()
  const selectedRow = detailsOpen
    ? (rows.find(({ span }) => span.spanId === selectedSpanId) ?? rows[0])
    : undefined
  const bounds = useMemo(() => traceBounds(rows), [rows])
  const ticks = useMemo(() => (bounds ? traceTicks(bounds) : []), [bounds])
  const selectedParent = rows.find(
    ({ span }) => span.spanId === selectedRow?.span.parentId
  )

  useKeyDown('Escape', () => fullscreen && setFullscreen(false))

  if (!activeTrace || !rows.length || !bounds) return null

  return (
    <TraceFullscreenSC
      disabled={!fullscreen}
      $fullscreen={fullscreen}
    >
      <TraceWaterfallSC $fullscreen={fullscreen}>
        <TraceHeaderSC>
          <TraceSummarySC>
            <TraceIdChip
              id={activeTrace.id}
              title={activeTrace.id}
            />
            <TraceMetric
              label="Duration"
              value={formatDuration(bounds.end - bounds.start)}
            />
            <TraceMetric
              label="Spans"
              value={String(activeTrace.spans.length)}
            />
            <TraceMetric
              label="Services"
              value={String(new Set(activeTrace.spans.map(serviceName)).size)}
            />
            <TraceStatusMetricSC>
              <CaptionP $color="text-xlight">Status</CaptionP>
              <TraceStatusChip severity={traceStatus(activeTrace.spans)} />
            </TraceStatusMetricSC>
          </TraceSummarySC>
          <TraceToolbarActionsSC>
            <TraceViewControl
              value={view}
              onChange={(nextView) => {
                setView(nextView)
                if (nextView !== 'timeline') setFullscreen(false)
              }}
            />
            {traceGroups.length > 1 && (
              <TraceSelectSC
                aria-label="Trace"
                value={activeTrace.id}
                onChange={(event) => {
                  setSelectedTraceId(event.target.value)
                  setSelectedSpanId(undefined)
                  setDetailsOpen(true)
                }}
              >
                {traceGroups.map(({ id, spans }) => (
                  <option
                    key={id}
                    value={id}
                  >
                    {shortTraceId(id)} · {formatSpanCount(spans.length)}
                  </option>
                ))}
              </TraceSelectSC>
            )}
            {view === 'timeline' && (
              <IconFrame
                clickable
                type="floating"
                icon={fullscreen ? <CloseIcon /> : <LinkoutIcon />}
                tooltip={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                onClick={() => setFullscreen((value) => !value)}
              >
                {fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              </IconFrame>
            )}
          </TraceToolbarActionsSC>
        </TraceHeaderSC>
        {view === 'timeline' ? (
          <TraceTimelineContentSC $details={!!selectedRow}>
            <TimelineSC $fullscreen={fullscreen}>
              <TimelineHeaderSC>
                <CaptionP $color="text-xlight">SPAN</CaptionP>
                <TraceAxisSC>
                  {ticks.map((tick) => (
                    <TraceTickSC key={tick.offset}>
                      <CaptionP $color="text-xlight">
                        {formatDuration(tick.offset)}
                      </CaptionP>
                    </TraceTickSC>
                  ))}
                </TraceAxisSC>
              </TimelineHeaderSC>
              {rows.map((row, index) => {
                const selected = row.span.spanId === selectedRow?.span.spanId
                const service = row.span.service ?? 'unknown service'
                const duration = row.end - row.start
                const { left, width } = traceBarPosition(row, bounds)
                const severity = traceSeverity(row.span.tags)
                const color = traceBarColor(service)

                return (
                  <TraceRowSC
                    key={row.span.spanId ?? `${row.span.name}-${row.start}`}
                    $selected={selected}
                    type="button"
                    onClick={() => {
                      setSelectedSpanId(row.span.spanId ?? undefined)
                      setDetailsOpen(true)
                    }}
                  >
                    <TraceLabelSC>
                      <TraceTreeGutter
                        depth={row.depth}
                        meta={tree[index]}
                      />
                      <TraceDotWrapSC>
                        {tree[index]?.hasChildren && <TraceDotDownSC />}
                        <ServiceDotSC $color={color.accent} />
                      </TraceDotWrapSC>
                      <TraceNameSC title={row.span.name ?? 'Unnamed span'}>
                        {row.span.name ?? 'Unnamed span'}
                      </TraceNameSC>
                      <TraceBarStatusIcon severity={severity} />
                      <TraceDurationSC>
                        {formatDuration(duration)}
                      </TraceDurationSC>
                    </TraceLabelSC>
                    <TraceBarAreaSC>
                      {ticks.map((tick) => (
                        <TraceGridLineSC
                          key={tick.offset}
                          $left={
                            (tick.offset /
                              Math.max(bounds.end - bounds.start, 1)) *
                            100
                          }
                        />
                      ))}
                      <TraceBarSC
                        $accent={color.accent}
                        $fill={color.fill}
                        $left={left}
                        $width={width}
                        title={`${service} · ${formatDuration(duration)}`}
                      >
                        <TraceBarTextSC $color={color.text}>
                          {row.span.name ?? 'Unnamed span'}
                        </TraceBarTextSC>
                        <TraceBarServiceSC $color={color.text}>
                          {service}
                        </TraceBarServiceSC>
                        <TraceBarStatusIcon severity={severity} />
                      </TraceBarSC>
                    </TraceBarAreaSC>
                  </TraceRowSC>
                )
              })}
            </TimelineSC>
            {selectedRow && (
              <TraceDetailSC $fullscreen={fullscreen}>
                <TraceDetailHeaderSC>
                  <TraceDetailTitleSC>
                    <Body2P $color="text-light">
                      {selectedRow.span.name ?? 'Unnamed span'}
                    </Body2P>
                    <IconFrame
                      clickable
                      icon={<CloseIcon />}
                      size="small"
                      tooltip="Close details"
                      type="tertiary"
                      onClick={(event) => {
                        event.stopPropagation()
                        setDetailsOpen(false)
                      }}
                    />
                  </TraceDetailTitleSC>
                  <Body1BoldP $color="text-light">
                    {formatDuration(selectedRow.end - selectedRow.start)}
                  </Body1BoldP>
                  <CaptionP $color="text-light">
                    offset +{formatDuration(selectedRow.start - bounds.start)}{' '}
                    from root
                  </CaptionP>
                </TraceDetailHeaderSC>
                <TraceDetailSectionSC>
                  <CaptionP $color="text-xlight">Span</CaptionP>
                  <TraceDetailFieldsSC>
                    <CaptionP $color="text-input-disabled">service</CaptionP>
                    <TraceServiceSC>
                      <ServiceDotSC
                        $color={
                          traceBarColor(
                            selectedRow.span.service ?? 'unknown service'
                          ).accent
                        }
                      />
                      <CaptionP $color="text-light">
                        {selectedRow.span.service ?? 'unknown service'}
                      </CaptionP>
                    </TraceServiceSC>
                    <CaptionP $color="text-input-disabled">status</CaptionP>
                    <TraceStatusChip
                      severity={traceSeverity(selectedRow.span.tags)}
                    />
                    {selectedParent && (
                      <>
                        <CaptionP $color="text-input-disabled">parent</CaptionP>
                        <TraceParentButtonSC
                          type="button"
                          onClick={() =>
                            setSelectedSpanId(
                              selectedParent.span.spanId ?? undefined
                            )
                          }
                        >
                          {selectedParent.span.name}
                        </TraceParentButtonSC>
                      </>
                    )}
                  </TraceDetailFieldsSC>
                </TraceDetailSectionSC>
                <TraceStatusMessage
                  severity={traceSeverity(selectedRow.span.tags)}
                  tags={selectedRow.span.tags}
                />
                <TraceAttributes tags={selectedRow.span.tags} />
              </TraceDetailSC>
            )}
          </TraceTimelineContentSC>
        ) : (
          <TraceTopology
            mode={view}
            spans={activeTrace.spans}
          />
        )}
        {summary && <Body2P $color="text-light">{summary}</Body2P>}
      </TraceWaterfallSC>
    </TraceFullscreenSC>
  )
}

type TraceView = 'services' | 'spans' | 'timeline'

const TRACE_VIEWS: { label: string; value: TraceView }[] = [
  { label: 'Timeline', value: 'timeline' },
  { label: 'Span graph', value: 'spans' },
  { label: 'Service graph', value: 'services' },
]

function TraceMetric({ label, value }: { label: string; value: string }) {
  return (
    <TraceMetricSC>
      <CaptionP $color="text-xlight">{label}</CaptionP>
      <Body2P>{value}</Body2P>
    </TraceMetricSC>
  )
}

function TraceIdChip({ id, title }: { id: string; title: string }) {
  return (
    <TraceIdChipSC title={title}>
      <span>trace_id </span>
      <span>{shortTraceId(id)}</span>
    </TraceIdChipSC>
  )
}

function TraceStatusChip({ severity }: { severity: TraceSeverity }) {
  return (
    <Chip
      fillLevel={2}
      icon={<TraceStatusIcon severity={severity} />}
      severity={severity}
      size="small"
    >
      {traceStatusLabel(severity)}
    </Chip>
  )
}

function TraceStatusIcon({ severity }: { severity: TraceSeverity }) {
  switch (severity) {
    case 'danger':
      return <ErrorIcon />
    case 'warning':
      return <WarningIcon />
    default:
      return <StatusOkIcon />
  }
}

function TraceViewControl({
  value,
  onChange,
}: {
  value: TraceView
  onChange: (view: TraceView) => void
}) {
  return (
    <TraceViewControlSC aria-label="Trace view">
      {TRACE_VIEWS.map(({ label, value: option }) => (
        <TraceViewButtonSC
          key={option}
          $active={option === value}
          type="button"
          aria-label={label}
          title={label}
          onClick={() => onChange(option)}
        >
          <TraceViewIcon view={option} />
        </TraceViewButtonSC>
      ))}
    </TraceViewControlSC>
  )
}

function TraceViewIcon({ view }: { view: TraceView }) {
  switch (view) {
    case 'spans':
      return <TreeViewIcon color="text-light" />
    case 'services':
      return <GraphIcon color="text-light" />
    default:
      return <TableIcon color="text-light" />
  }
}

function TraceTreeGutter({
  depth,
  meta,
}: {
  depth: number
  meta: TraceTreeMeta
}) {
  return (
    <TraceTreeGutterSC $depth={depth}>
      {meta.ancestorContinues.map(
        (continues, index) =>
          continues && (
            <TraceTreeLineSC
              key={index}
              $kind="ancestor"
              $step={index}
            />
          )
      )}
      {depth > 0 && (
        <TraceTreeLineSC
          $kind="elbow"
          $step={depth - 1}
        />
      )}
    </TraceTreeGutterSC>
  )
}

function TraceStatusMessage({
  severity,
  tags,
}: {
  severity: TraceSeverity
  tags: Nullable<Record<string, unknown>>
}) {
  const message = traceStatusMessage(tags)
  if (!message || severity === 'success') return null

  return (
    <TraceDetailSectionSC>
      <CaptionP $color="text-xlight">{traceStatusLabel(severity)}</CaptionP>
      <TraceMessageSC>
        <CaptionP $color="text-light">{message}</CaptionP>
      </TraceMessageSC>
    </TraceDetailSectionSC>
  )
}

function TraceAttributes({
  tags,
}: {
  tags: Nullable<Record<string, unknown>>
}) {
  const entries = Object.entries(tags ?? {}).filter(
    ([, value]) => value != null && value !== ''
  )
  if (!entries.length) return null

  return (
    <TraceDetailSectionSC>
      <CaptionP $color="text-xlight">Attributes</CaptionP>
      <TraceDetailFieldsSC>
        {entries.map(([key, value]) => {
          const status = httpStatusFromAttribute(key, value)

          return (
            <FragmentPair
              key={key}
              label={key}
            >
              {status != null ? (
                <TraceServiceSC>
                  <ServiceDotSC $color={httpStatusDot(status)} />
                  <CaptionP $color="text-light">{String(status)}</CaptionP>
                </TraceServiceSC>
              ) : (
                <CaptionP
                  $color="text-light"
                  title={formatTagValue(value)}
                >
                  {formatTagValue(value)}
                </CaptionP>
              )}
            </FragmentPair>
          )
        })}
      </TraceDetailFieldsSC>
    </TraceDetailSectionSC>
  )
}

function FragmentPair({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <>
      <CaptionP $color="text-input-disabled">{label}</CaptionP>
      {children}
    </>
  )
}

export function orderTraceSpans(traces: TraceSpan[]): TraceRow[] {
  const spans = traces
    .map((span) => {
      const start = dateToMs(span.start)
      const end = dateToMs(span.end)
      if (start == null || end == null) return null

      return { end: Math.max(start, end), span, start }
    })
    .filter(isNonNullable)
    .sort((a, b) => a.start - b.start || a.end - b.end)

  const spansByParent = new Map<string, typeof spans>()
  const spanIds = new Set(
    spans.map(({ span }) => span.spanId).filter(isNonNullable)
  )

  spans.forEach((span) => {
    const parentId = span.span.parentId
    const children = parentId ? (spansByParent.get(parentId) ?? []) : []
    if (parentId) spansByParent.set(parentId, [...children, span])
  })

  const ordered: TraceRow[] = []
  const visited = new Set<(typeof spans)[number]>()
  const visit = (span: (typeof spans)[number], depth: number) => {
    const id = span.span.spanId
    if (visited.has(span)) return
    visited.add(span)

    ordered.push({ ...span, depth })
    const children = id ? (spansByParent.get(id) ?? []) : []
    children.forEach((child) => visit(child, depth + 1))
  }

  spans
    .filter(({ span }) => !span.parentId || !spanIds.has(span.parentId))
    .forEach((span) => visit(span, 0))
  spans.forEach((span) => visit(span, 0))

  return ordered
}

export function traceTreeMeta(rows: TraceRow[]): TraceTreeMeta[] {
  return rows.map((row, index) => {
    const next = rows[index + 1]

    return {
      ancestorContinues: Array.from(
        { length: row.depth },
        (_, depth) => !!next && next.depth > depth
      ),
      hasChildren: !!next && next.depth > row.depth,
    }
  })
}

function groupTraces(traces: TraceSpan[]) {
  const groups = new Map<string, TraceSpan[]>()
  traces.forEach((trace, index) => {
    const id = trace.traceId ?? `trace-${index}`
    groups.set(id, [...(groups.get(id) ?? []), trace])
  })

  return [...groups.entries()].map(([id, spans]) => ({ id, spans }))
}

function traceBounds(rows: TraceRow[]) {
  if (!rows.length) return null

  return {
    end: Math.max(...rows.map(({ end }) => end)),
    start: Math.min(...rows.map(({ start }) => start)),
  }
}

function traceTicks(bounds: { end: number; start: number }) {
  const duration = bounds.end - bounds.start

  return Array.from({ length: 5 }, (_, index) => ({
    offset: (duration * index) / 4,
  }))
}

function traceBarPosition(
  row: TraceRow,
  bounds: { end: number; start: number }
) {
  const duration = Math.max(bounds.end - bounds.start, 1)
  const left = ((row.start - bounds.start) / duration) * 100
  const width = Math.max(((row.end - row.start) / duration) * 100, 0.75)

  return { left, width: Math.min(width, 100 - left) }
}

function dateToMs(value: Nullable<string>) {
  if (!value) return null
  const date = new Date(value)
  const timestamp = date.getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

function formatDuration(duration: number) {
  if (duration < 1_000) return `${Math.round(duration)}ms`
  if (duration < 60_000) return `${(duration / 1_000).toFixed(2)}s`
  return `${(duration / 60_000).toFixed(1)}m`
}

function serviceName(span: TraceSpan) {
  return span.service ?? 'unknown service'
}

export function formatSpanCount(count: number) {
  return `${count} ${count === 1 ? 'span' : 'spans'}`
}

function shortTraceId(traceId: string) {
  return traceId.length > 12 ? `${traceId.slice(0, 12)}…` : traceId
}

type TraceSeverity = 'danger' | 'success' | 'warning'

export function traceSeverity(
  tags: Nullable<Record<string, unknown>>
): TraceSeverity {
  const status = tagValue(tags, [
    'otel.status_code',
    'status.code',
    'status_code',
    'status',
  ])

  if (
    truthyTag(tagValue(tags, ['error', 'error.type', 'exception.type'])) ||
    matchesStatus(status, ['error', 'failed', 'failure']) ||
    errorHttpStatus(
      tagValue(tags, ['http.status_code', 'http.response.status_code'])
    )
  )
    return 'danger'

  if (matchesStatus(status, ['warning', 'warn'])) return 'warning'

  return 'success'
}

export function traceStatusMessage(tags: Nullable<Record<string, unknown>>) {
  const value = tagValue(tags, [
    'otel.status_description',
    'exception.message',
    'error.message',
  ])

  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function httpStatusFromAttribute(key: string, value: unknown) {
  if (!/status([. _]?code)?$/i.test(key)) return undefined

  const status = Number(value)
  return Number.isFinite(status) ? status : undefined
}

function tagValue(tags: Nullable<Record<string, unknown>>, names: string[]) {
  if (!tags) return undefined

  const name = names.find((key) => key in tags)
  return name ? tags[name] : undefined
}

function truthyTag(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value !== 'string') return false

  return !['', '0', 'false', 'none', 'null', 'undefined'].includes(
    value.toLowerCase()
  )
}

function matchesStatus(value: unknown, statuses: string[]) {
  return (
    typeof value === 'string' && statuses.includes(value.toLocaleLowerCase())
  )
}

function errorHttpStatus(value: unknown) {
  const status = Number(value)
  return Number.isFinite(status) && status >= 500
}

function httpStatusDot(status: number) {
  if (status >= 500) return '#E95374'
  if (status >= 400) return '#F6AD55'
  return '#99F5D5'
}

function traceStatus(spans: TraceSpan[]): TraceSeverity {
  if (spans.some(({ tags }) => traceSeverity(tags) === 'danger'))
    return 'danger'
  if (spans.some(({ tags }) => traceSeverity(tags) === 'warning'))
    return 'warning'

  return 'success'
}

function traceStatusLabel(severity: TraceSeverity) {
  switch (severity) {
    case 'danger':
      return 'Firing'
    case 'warning':
      return 'Warning'
    default:
      return 'Healthy'
  }
}

function TraceBarStatusIcon({ severity }: { severity: TraceSeverity }) {
  if (severity === 'danger')
    return (
      <ErrorIcon
        color="icon-danger"
        size={16}
      />
    )
  if (severity === 'warning')
    return (
      <WarningIcon
        color="icon-warning"
        size={16}
      />
    )

  return null
}

function formatTagValue(value: unknown) {
  if (typeof value === 'string') return value
  if (value == null) return '—'
  return JSON.stringify(value) ?? String(value)
}

const TREE_STEP = 16

const TraceFullscreenSC = styled(FocusLock)<{ $fullscreen: boolean }>(
  ({ theme, $fullscreen }) => ({
    ...($fullscreen
      ? {
          background: theme.colors['fill-zero'],
          inset: 0,
          padding: theme.spacing.large,
          position: 'fixed',
          zIndex: theme.zIndexes.modal,
        }
      : { display: 'contents' }),
  })
)

const TraceWaterfallSC = styled.div<{ $fullscreen: boolean }>(
  ({ $fullscreen }) => ({
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    width: '100%',
    ...($fullscreen && { height: '100%' }),
  })
)

const TraceHeaderSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  borderBottom: `1px solid ${theme.colors.border}`,
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.medium,
  justifyContent: 'space-between',
  minHeight: 72,
  padding: `${theme.spacing.xsmall}px ${theme.spacing.small}px`,
}))

const TraceSummarySC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.large,
  minWidth: 0,
}))

const TraceIdChipSC = styled.span(({ theme }) => ({
  ...theme.partials.text.body2,
  fontFamily: theme.fontFamilies.mono,
  minWidth: 0,
  overflow: 'hidden',
  padding: `${theme.spacing.xxsmall}px ${theme.spacing.small}px`,
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  '> span:last-child': { color: theme.colors['text-xlight'] },
}))

const TraceMetricSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
  padding: `0 ${theme.spacing.xsmall}px`,
}))

const TraceStatusMetricSC = styled(TraceMetricSC)({
  alignItems: 'flex-start',
})

const TraceToolbarActionsSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.xsmall,
  justifyContent: 'flex-end',
  '@media (max-width: 720px)': {
    justifyContent: 'space-between',
    width: '100%',
  },
}))

const TraceViewControlSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  background: theme.colors['fill-zero'],
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadiuses.medium,
  display: 'flex',
  gap: 2,
  padding: 2,
  '@media (max-width: 720px)': {
    flex: 1,
  },
}))

const TraceViewButtonSC = styled.button<{ $active: boolean }>(
  ({ theme, $active }) => ({
    ...theme.partials.reset.button,
    background: $active ? theme.colors['fill-three'] : 'transparent',
    borderRadius: theme.borderRadiuses.medium,
    color: theme.colors['text-light'],
    cursor: $active ? 'default' : 'pointer',
    display: 'grid',
    height: 32,
    placeItems: 'center',
    width: 32,
    '&:focus-visible': {
      outline: `1px solid ${theme.colors['border-outline-focused']}`,
      outlineOffset: 1,
    },
  })
)

const TraceSelectSC = styled.select(({ theme }) => ({
  background: theme.colors['fill-two'],
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadiuses.medium,
  color: theme.colors.text,
  fontSize: 12,
  maxWidth: 180,
  padding: `${theme.spacing.xxsmall}px ${theme.spacing.xsmall}px`,
  '@media (max-width: 720px)': {
    flex: 1,
    maxWidth: 'none',
  },
}))

const TraceTimelineContentSC = styled.div<{ $details: boolean }>(
  ({ $details }) => ({
    display: 'grid',
    flex: 1,
    gridTemplateColumns: $details ? 'minmax(0, 1fr) 250px' : 'minmax(0, 1fr)',
    minHeight: 0,
    '@media (max-width: 960px)': {
      gridTemplateColumns: 'minmax(0, 1fr)',
    },
  })
)

const TimelineSC = styled.div<{ $fullscreen: boolean }>(
  ({ theme, $fullscreen }) => ({
    border: `1px solid ${theme.colors.border}`,
    flex: 1,
    maxHeight: $fullscreen ? 'calc(100vh - 136px)' : 576,
    overflowX: 'hidden',
    overflowY: 'auto',
    '@media (max-width: 720px)': {
      maxHeight: $fullscreen ? 'calc(100vh - 280px)' : 576,
    },
  })
)

const TimelineHeaderSC = styled.div(({ theme }) => ({
  background: theme.colors['fill-zero'],
  borderBottom: `1px solid ${theme.colors.border}`,
  display: 'grid',
  gridTemplateColumns: '256px minmax(0, 1fr)',
  minHeight: 50,
  position: 'sticky',
  top: 0,
  zIndex: 1,
  '> :first-child': {
    alignItems: 'center',
    display: 'flex',
    padding: `0 ${theme.spacing.medium}px`,
  },
  '@media (max-width: 720px)': {
    gridTemplateColumns: 'minmax(160px, 200px) minmax(0, 1fr)',
  },
}))

const TraceAxisSC = styled.div(() => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
}))

const TraceTickSC = styled.div(({ theme }) => ({
  alignItems: 'flex-start',
  borderLeft: `1px solid ${theme.colors.border}`,
  display: 'flex',
  padding: `${theme.spacing.small}px ${theme.spacing.small}px 0`,
}))

const TraceRowSC = styled.button<{ $selected: boolean }>(
  ({ theme, $selected }) => ({
    alignItems: 'stretch',
    background: $selected ? theme.colors['fill-three'] : 'transparent',
    border: 'none',
    borderBottom: `1px solid ${theme.colors['border-fill-two']}`,
    color: 'inherit',
    cursor: 'pointer',
    display: 'grid',
    gridTemplateColumns: '256px minmax(0, 1fr)',
    minHeight: 64,
    padding: 0,
    textAlign: 'left',
    width: '100%',
    '&:hover': { background: theme.colors['fill-two'] },
    '&:last-child': { borderBottom: 'none' },
    '@media (max-width: 720px)': {
      gridTemplateColumns: 'minmax(160px, 200px) minmax(0, 1fr)',
    },
  })
)

const TraceLabelSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  borderRight: `1px solid ${theme.colors.border}`,
  display: 'flex',
  gap: theme.spacing.xsmall,
  minWidth: 0,
  padding: `0 ${theme.spacing.small}px`,
}))

const TraceTreeGutterSC = styled.div<{ $depth: number }>(({ $depth }) => ({
  alignSelf: 'stretch',
  flexShrink: 0,
  position: 'relative',
  width: Math.max($depth * TREE_STEP, $depth > 0 ? TREE_STEP : 0),
}))

const TraceTreeLineSC = styled.span<{
  $kind: 'ancestor' | 'elbow'
  $step: number
}>(({ theme, $kind, $step }) => {
  const left = $step * TREE_STEP + 3

  if ($kind === 'ancestor')
    return {
      background: theme.colors.border,
      bottom: 0,
      left,
      position: 'absolute',
      top: 0,
      width: 1,
    }

  return {
    borderBottom: `1px solid ${theme.colors.border}`,
    borderLeft: `1px solid ${theme.colors.border}`,
    height: '50%',
    left,
    position: 'absolute',
    top: 0,
    width: TREE_STEP - 6,
  }
})

const TraceDotWrapSC = styled.span({
  alignItems: 'center',
  alignSelf: 'stretch',
  display: 'flex',
  flexShrink: 0,
  position: 'relative',
})

const TraceDotDownSC = styled.span(({ theme }) => ({
  background: theme.colors.border,
  bottom: 0,
  left: 3,
  position: 'absolute',
  top: '50%',
  width: 1,
}))

const ServiceDotSC = styled.span<{ $color: string }>(({ $color }) => ({
  background: $color,
  borderRadius: '50%',
  flexShrink: 0,
  height: 8,
  width: 8,
}))

const TraceNameSC = styled.span(({ theme }) => ({
  color: theme.colors['text-light'],
  fontSize: 12,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}))

const TraceDurationSC = styled.span(({ theme }) => ({
  color: theme.colors['text-xlight'],
  fontFamily: theme.fontFamilies.mono,
  fontSize: 12,
  marginLeft: 'auto',
  paddingLeft: theme.spacing.xsmall,
  whiteSpace: 'nowrap',
}))

const TraceBarAreaSC = styled.div(() => ({
  minWidth: 0,
  position: 'relative',
}))

const TraceGridLineSC = styled.span<{ $left: number }>(({ theme, $left }) => ({
  background: theme.colors.border,
  bottom: 0,
  left: `${$left}%`,
  position: 'absolute',
  top: 0,
  width: 1,
}))

const TraceBarSC = styled.span<{
  $accent: string
  $fill: string
  $left: number
  $width: number
}>(({ theme, $accent, $fill, $left, $width }) => ({
  alignItems: 'center',
  background: $fill,
  borderLeft: `3px solid ${$accent}`,
  borderRadius: theme.borderRadiuses.medium,
  display: 'flex',
  gap: theme.spacing.medium,
  height: 32,
  left: `${$left}%`,
  overflow: 'hidden',
  padding: `${theme.spacing.xxsmall}px 12px ${theme.spacing.xxsmall}px ${theme.spacing.medium}px`,
  position: 'absolute',
  top: 16,
  width: `${$width}%`,
}))

const TraceBarTextSC = styled.span<{ $color: string }>(({ $color }) => ({
  color: $color,
  flexShrink: 1,
  fontSize: 16,
  fontWeight: 600,
  letterSpacing: '0.25px',
  lineHeight: '24px',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}))

const TraceBarServiceSC = styled.span<{ $color: string }>(({ $color }) => ({
  color: $color,
  flex: 1,
  fontSize: 14,
  letterSpacing: '0.5px',
  lineHeight: '20px',
  minWidth: 0,
  opacity: 0.85,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}))

const TraceDetailSC = styled.div<{ $fullscreen: boolean }>(
  ({ theme, $fullscreen }) => ({
    background: theme.colors['fill-two'],
    borderLeft: `1px solid ${theme.colors['border-fill-two']}`,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.large,
    maxHeight: $fullscreen ? 'calc(100vh - 136px)' : undefined,
    overflowY: 'auto',
    padding: theme.spacing.medium,
    width: 250,
    '@media (max-width: 960px)': {
      borderLeft: 'none',
      borderTop: `1px solid ${theme.colors.border}`,
      maxHeight: 'none',
      width: 'auto',
    },
  })
)

const TraceDetailHeaderSC = styled.div(({ theme }) => ({
  borderBottom: `1px solid ${theme.colors.border}`,
  display: 'grid',
  gap: theme.spacing.xsmall,
  paddingBottom: theme.spacing.large,
}))

const TraceDetailTitleSC = styled.div(({ theme }) => ({
  alignItems: 'flex-start',
  display: 'flex',
  gap: theme.spacing.xxsmall,
  justifyContent: 'space-between',
}))

const TraceDetailSectionSC = styled.div(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing.xsmall,
  paddingBottom: theme.spacing.large,
  '&:not(:last-child)': {
    borderBottom: `1px solid ${theme.colors.border}`,
  },
}))

const TraceDetailFieldsSC = styled.div(({ theme }) => ({
  alignItems: 'start',
  display: 'grid',
  gap: `${theme.spacing.xsmall}px ${theme.spacing.xsmall}px`,
  gridTemplateColumns: 'minmax(72px, max-content) minmax(0, 1fr)',
}))

const TraceServiceSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.xsmall,
  minWidth: 0,
}))

const TraceParentButtonSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  ...theme.partials.text.caption,
  color: theme.colors['action-link-inline'],
  cursor: 'pointer',
  textAlign: 'left',
  '&:hover': { textDecoration: 'underline' },
}))

const TraceMessageSC = styled.div(({ theme }) => ({
  background: theme.colors['fill-one'],
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadiuses.medium,
  padding: theme.spacing.xsmall,
}))
