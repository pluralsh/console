import { Body2BoldP, Body2P, CaptionP } from 'components/utils/typography/Text'
import { WorkbenchJobActivityTraceFragment } from 'generated/graphql'
import { useKeyDown } from '@react-hooks-library/core'
import {
  CloseIcon,
  ErrorIcon,
  GraphIcon,
  IconFrame,
  LinkoutIcon,
  TableIcon,
  TreeViewIcon,
  WarningIcon,
} from '@pluralsh/design-system'
import { useMemo, useState } from 'react'
import FocusLock from 'react-focus-lock'
import styled from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import { TraceTopology } from './WorkbenchJobTraceTopology'

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
  const activeTrace =
    traceGroups.find(({ id }) => id === selectedTraceId) ?? traceGroups[0]

  const rows = useMemo(
    () => orderTraceSpans(activeTrace?.spans ?? []),
    [activeTrace?.spans]
  )
  const [selectedSpanId, setSelectedSpanId] = useState<string>()
  const selectedRow =
    rows.find(({ span }) => span.spanId === selectedSpanId) ?? rows[0]
  const bounds = useMemo(() => traceBounds(rows), [rows])
  const ticks = useMemo(() => traceTicks(bounds), [bounds])
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
            <TraceIdentifierSC>
              <CaptionP $color="text-xlight">trace_id</CaptionP>
              <TraceIdSC>{shortTraceId(activeTrace.id)}</TraceIdSC>
            </TraceIdentifierSC>
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
              <TraceStatusSC $severity={traceStatus(activeTrace.spans)}>
                {traceStatusLabel(traceStatus(activeTrace.spans))}
              </TraceStatusSC>
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
                onChange={(event) => setSelectedTraceId(event.target.value)}
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
          <TraceTimelineContentSC $fullscreen={fullscreen}>
            <TimelineSC $fullscreen={fullscreen}>
              <TimelineHeaderSC>
                <CaptionP $color="text-xlight">Span</CaptionP>
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
              {rows.map((row) => {
                const selected = row.span.spanId === selectedRow?.span.spanId
                const service = row.span.service ?? 'unknown service'
                const duration = row.end - row.start
                const { left, width } = traceBarPosition(row, bounds)
                const severity = traceSeverity(row.span.tags)
                const color = traceColor(service)

                return (
                  <TraceRowSC
                    key={row.span.spanId ?? `${row.span.name}-${row.start}`}
                    $selected={selected}
                    type="button"
                    onClick={() =>
                      setSelectedSpanId(row.span.spanId ?? undefined)
                    }
                  >
                    <TraceLabelSC $depth={row.depth}>
                      <ServiceDotSC $color={serviceColor(service)} />
                      <TraceNameSC title={row.span.name ?? 'Unnamed span'}>
                        {row.span.name ?? 'Unnamed span'}
                      </TraceNameSC>
                      <TraceDurationSC>
                        {formatDuration(duration)}
                      </TraceDurationSC>
                    </TraceLabelSC>
                    <TraceBarAreaSC>
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
                  <Body2BoldP>
                    {selectedRow.span.name ?? 'Unnamed span'}
                  </Body2BoldP>
                  <Body2BoldP>
                    {formatDuration(selectedRow.end - selectedRow.start)}
                  </Body2BoldP>
                  <CaptionP $color="text-xlight">
                    offset +{formatDuration(selectedRow.start - bounds.start)}
                  </CaptionP>
                </TraceDetailHeaderSC>
                <TraceDetailSectionSC>
                  <CaptionP $color="text-xlight">Span</CaptionP>
                  <Body2P>{selectedRow.span.name ?? 'Unnamed span'}</Body2P>
                  <CaptionP $color="text-xlight">Service</CaptionP>
                  <TraceServiceSC>
                    <ServiceDotSC
                      $color={serviceColor(
                        selectedRow.span.service ?? 'unknown service'
                      )}
                    />
                    <Body2P>
                      {selectedRow.span.service ?? 'unknown service'}
                    </Body2P>
                  </TraceServiceSC>
                  {selectedParent && (
                    <>
                      <CaptionP $color="text-xlight">Parent</CaptionP>
                      <Body2P>{selectedParent.span.name}</Body2P>
                    </>
                  )}
                </TraceDetailSectionSC>
                <TraceTagsSC>
                  {Object.entries(selectedRow.span.tags ?? {}).map(
                    ([key, value]) => (
                      <div key={key}>
                        <CaptionP $color="text-xlight">{key}</CaptionP>
                        <CaptionP>{formatTagValue(value)}</CaptionP>
                      </div>
                    )
                  )}
                </TraceTagsSC>
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

function serviceColor(service: string) {
  return traceColor(service).accent
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

function tagValue(tags: Nullable<Record<string, unknown>>, names: string[]) {
  if (!tags) return undefined

  const entry = Object.entries(tags).find(([name]) => names.includes(name))
  return entry?.[1]
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

const TRACE_COLORS = [
  { accent: '#3CECAF', fill: '#0A6B4A', text: '#F1FEF9' },
  { accent: '#F6AD55', fill: '#9C4221', text: '#FFFAF0' },
  { accent: '#33B4FF', fill: '#004166', text: '#F0F9FF' },
  { accent: '#E95374', fill: '#660A19', text: '#FFF0F2' },
  { accent: '#B794F4', fill: '#553C9A', text: '#F1F1FE' },
]

function traceColor(service: string) {
  const hash = [...service].reduce(
    (value, char) => value + char.charCodeAt(0),
    0
  )

  return TRACE_COLORS[hash % TRACE_COLORS.length]
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
      return 'Error'
    case 'warning':
      return 'Warning'
    default:
      return 'Healthy'
  }
}

function TraceBarStatusIcon({ severity }: { severity: TraceSeverity }) {
  if (severity === 'danger') return <ErrorIcon color="icon-danger" />
  if (severity === 'warning') return <WarningIcon color="icon-warning" />

  return null
}

function formatTagValue(value: unknown) {
  if (typeof value === 'string') return value
  if (value == null) return '—'
  return JSON.stringify(value) ?? String(value)
}

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
  padding: `0 ${theme.spacing.small}px`,
}))

const TraceSummarySC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.large,
  minWidth: 0,
}))

const TraceIdentifierSC = styled.div(({ theme }) => ({
  alignItems: 'baseline',
  display: 'flex',
  gap: theme.spacing.xsmall,
  minWidth: 0,
}))

const TraceIdSC = styled.span(({ theme }) => ({
  color: theme.colors['text-light'],
  fontFamily: theme.fontFamilies.mono,
  fontSize: 12,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}))

const TraceMetricSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
}))

const TraceStatusMetricSC = styled(TraceMetricSC)({
  alignItems: 'flex-start',
})

const TraceStatusSC = styled.span<{ $severity: TraceSeverity }>(
  ({ theme, $severity }) => ({
    background:
      $severity === 'danger'
        ? theme.colors.red[800]
        : $severity === 'warning'
          ? theme.colors.yellow[800]
          : theme.colors.green[800],
    borderRadius: theme.borderRadiuses.small,
    color:
      $severity === 'danger'
        ? theme.colors.red[50]
        : $severity === 'warning'
          ? theme.colors.yellow[50]
          : theme.colors.green[50],
    fontSize: 12,
    lineHeight: '20px',
    padding: `0 ${theme.spacing.xsmall}px`,
  })
)

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

const TraceTimelineContentSC = styled.div<{ $fullscreen: boolean }>(() => ({
  display: 'grid',
  flex: 1,
  gridTemplateColumns: 'minmax(0, 1fr) 236px',
  minHeight: 0,
  '@media (max-width: 960px)': {
    gridTemplateColumns: 'minmax(0, 1fr)',
  },
}))

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
  gridTemplateColumns: 'minmax(200px, 256px) minmax(0, 1fr)',
  minHeight: 48,
  position: 'sticky',
  top: 0,
  zIndex: 1,
}))

const TraceAxisSC = styled.div(() => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
}))

const TraceTickSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  borderLeft: `1px solid ${theme.colors.border}`,
  display: 'flex',
  padding: `0 ${theme.spacing.small}px`,
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
    gridTemplateColumns: 'minmax(200px, 256px) minmax(0, 1fr)',
    minHeight: 64,
    padding: 0,
    textAlign: 'left',
    width: '100%',
    '&:hover': { background: theme.colors['fill-two'] },
    '&:last-child': { borderBottom: 'none' },
  })
)

const TraceLabelSC = styled.div<{ $depth: number }>(({ theme, $depth }) => ({
  alignItems: 'center',
  borderRight: `1px solid ${theme.colors.border}`,
  display: 'flex',
  gap: theme.spacing.xsmall,
  minWidth: 0,
  padding: `0 ${theme.spacing.small}px 0 ${
    theme.spacing.small + $depth * theme.spacing.medium
  }px`,
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
  padding: `${theme.spacing.xxsmall}px ${theme.spacing.small}px ${theme.spacing.xxsmall}px ${theme.spacing.medium}px`,
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  width: `${$width}%`,
}))

const TraceBarTextSC = styled.span<{ $color: string }>(({ $color }) => ({
  color: $color,
  flex: 1,
  fontSize: 16,
  fontWeight: 600,
  letterSpacing: '0.25px',
  lineHeight: '24px',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}))

const TraceDetailSC = styled.div<{ $fullscreen: boolean }>(
  ({ theme, $fullscreen }) => ({
    borderLeft: `1px solid ${theme.colors.border}`,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.small,
    maxHeight: $fullscreen ? 'calc(100vh - 136px)' : undefined,
    overflowY: 'auto',
    padding: theme.spacing.small,
    width: $fullscreen ? 260 : 236,
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
  gap: theme.spacing.xxsmall,
  paddingBottom: theme.spacing.small,
}))

const TraceDetailSectionSC = styled.div(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing.xxsmall,
}))

const TraceServiceSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.xsmall,
}))

const TraceTagsSC = styled.div(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing.xsmall,
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  '> div': {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
}))
