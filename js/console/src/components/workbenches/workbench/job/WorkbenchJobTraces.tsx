import { Body2BoldP, Body2P, CaptionP } from 'components/utils/typography/Text'
import { WorkbenchJobActivityTraceFragment } from 'generated/graphql'
import { useMemo, useState } from 'react'
import styled from 'styled-components'
import { COLORS } from 'utils/color'
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

  if (!activeTrace || !rows.length || !bounds) return null

  return (
    <TraceWaterfallSC>
      <TraceToolbarSC>
        <div>
          <Body2BoldP>{activeTrace.spans.length} spans</Body2BoldP>
          <CaptionP $color="text-xlight">
            {formatDuration(bounds.end - bounds.start)} total duration
          </CaptionP>
        </div>
        <TraceToolbarActionsSC>
          <TraceViewControl
            value={view}
            onChange={setView}
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
                  {shortTraceId(id)} · {spans.length} spans
                </option>
              ))}
            </TraceSelectSC>
          )}
        </TraceToolbarActionsSC>
      </TraceToolbarSC>
      {view === 'timeline' ? (
        <>
          <TimelineSC>
            <TimelineHeaderSC>
              <CaptionP $color="text-xlight">Span</CaptionP>
              <TraceAxisSC>
                <CaptionP $color="text-xlight">
                  {formatTime(bounds.start)}
                </CaptionP>
                <CaptionP $color="text-xlight">
                  {formatTime(bounds.end)}
                </CaptionP>
              </TraceAxisSC>
            </TimelineHeaderSC>
            {rows.map((row) => {
              const selected = row.span.spanId === selectedRow?.span.spanId
              const service = row.span.service ?? 'unknown service'
              const duration = row.end - row.start
              const { left, width } = traceBarPosition(row, bounds)

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
                      $color={serviceColor(service)}
                      $left={left}
                      $width={width}
                      title={`${service} · ${formatDuration(duration)}`}
                    />
                  </TraceBarAreaSC>
                </TraceRowSC>
              )
            })}
          </TimelineSC>
          {selectedRow && (
            <TraceDetailSC>
              <div>
                <Body2BoldP>
                  {selectedRow.span.name ?? 'Unnamed span'}
                </Body2BoldP>
                <CaptionP $color="text-xlight">
                  {selectedRow.span.service ?? 'unknown service'} ·{' '}
                  {formatDuration(selectedRow.end - selectedRow.start)}
                </CaptionP>
              </div>
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
        </>
      ) : (
        <TraceTopology
          mode={view}
          spans={activeTrace.spans}
        />
      )}
      {summary && <Body2P $color="text-light">{summary}</Body2P>}
    </TraceWaterfallSC>
  )
}

type TraceView = 'services' | 'spans' | 'timeline'

const TRACE_VIEWS: { label: string; value: TraceView }[] = [
  { label: 'Timeline', value: 'timeline' },
  { label: 'Spans', value: 'spans' },
  { label: 'Services', value: 'services' },
]

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
          onClick={() => onChange(option)}
        >
          {label}
        </TraceViewButtonSC>
      ))}
    </TraceViewControlSC>
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

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function shortTraceId(traceId: string) {
  return traceId.length > 12 ? `${traceId.slice(0, 12)}…` : traceId
}

function serviceColor(service: string) {
  const hash = [...service].reduce(
    (value, char) => value + char.charCodeAt(0),
    0
  )
  return COLORS[hash % COLORS.length]
}

function formatTagValue(value: unknown) {
  if (typeof value === 'string') return value
  if (value == null) return '—'
  return JSON.stringify(value) ?? String(value)
}

const TraceWaterfallSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  minWidth: 0,
  width: '100%',
}))

const TraceToolbarSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.small,
  justifyContent: 'space-between',
}))

const TraceToolbarActionsSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.xsmall,
  justifyContent: 'flex-end',
}))

const TraceViewControlSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  background: theme.colors['fill-zero'],
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadiuses.medium,
  display: 'flex',
  gap: 2,
  padding: 2,
}))

const TraceViewButtonSC = styled.button<{ $active: boolean }>(
  ({ theme, $active }) => ({
    ...theme.partials.reset.button,
    ...theme.partials.text.buttonSmall,
    background: $active ? theme.colors['fill-three'] : 'transparent',
    borderRadius: theme.borderRadiuses.medium,
    color: theme.colors['text-light'],
    cursor: $active ? 'default' : 'pointer',
    minHeight: 28,
    padding: `0 ${theme.spacing.xsmall}px`,
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
}))

const TimelineSC = styled.div(({ theme }) => ({
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadiuses.medium,
  overflow: 'hidden',
}))

const TimelineHeaderSC = styled.div(({ theme }) => ({
  background: theme.colors['fill-two'],
  borderBottom: `1px solid ${theme.colors.border}`,
  display: 'grid',
  gridTemplateColumns: 'minmax(140px, 38%) minmax(0, 1fr)',
  minHeight: 28,
  padding: `0 ${theme.spacing.small}px`,
}))

const TraceAxisSC = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  paddingLeft: theme.spacing.small,
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
    gridTemplateColumns: 'minmax(140px, 38%) minmax(0, 1fr)',
    minHeight: 34,
    padding: `0 ${theme.spacing.small}px`,
    textAlign: 'left',
    width: '100%',
    '&:hover': { background: theme.colors['fill-two'] },
    '&:last-child': { borderBottom: 'none' },
  })
)

const TraceLabelSC = styled.div<{ $depth: number }>(({ theme, $depth }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.xsmall,
  minWidth: 0,
  paddingLeft: $depth * theme.spacing.small,
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
  fontSize: 10,
  marginLeft: 'auto',
  paddingLeft: theme.spacing.xsmall,
  whiteSpace: 'nowrap',
}))

const TraceBarAreaSC = styled.div(({ theme }) => ({
  backgroundImage: `linear-gradient(to right, ${theme.colors['border-fill-two']} 1px, transparent 1px)`,
  backgroundSize: '25% 100%',
  minWidth: 0,
  position: 'relative',
}))

const TraceBarSC = styled.span<{
  $color: string
  $left: number
  $width: number
}>(({ theme, $color, $left, $width }) => ({
  background: $color,
  borderRadius: theme.borderRadiuses.medium,
  height: 14,
  left: `${$left}%`,
  opacity: 0.85,
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  width: `${$width}%`,
}))

const TraceDetailSC = styled.div(({ theme }) => ({
  background: theme.colors['fill-two'],
  border: `1px solid ${theme.colors['border-fill-two']}`,
  borderRadius: theme.borderRadiuses.medium,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  padding: theme.spacing.small,
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
