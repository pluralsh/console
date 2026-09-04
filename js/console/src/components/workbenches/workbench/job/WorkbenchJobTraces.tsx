import { Body2BoldP, Body2P, CaptionP } from 'components/utils/typography/Text'
import { WorkbenchJobActivityTraceFragment } from 'generated/graphql'
import { useKeyDown } from '@react-hooks-library/core'
import { CloseIcon, IconFrame, LinkoutIcon } from '@pluralsh/design-system'
import { useMemo, useState } from 'react'
import FocusLock from 'react-focus-lock'
import styled, { DefaultTheme, useTheme } from 'styled-components'
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
  const [fullscreen, setFullscreen] = useState(false)
  const theme = useTheme()
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

  useKeyDown('Escape', () => fullscreen && setFullscreen(false))

  if (!activeTrace || !rows.length || !bounds) return null

  return (
    <TraceFullscreenSC
      disabled={!fullscreen}
      $fullscreen={fullscreen}
    >
      <TraceWaterfallSC $fullscreen={fullscreen}>
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
                    {shortTraceId(id)} · {spans.length} spans
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
        </TraceToolbarSC>
        {view === 'timeline' ? (
          <TraceTimelineContentSC $fullscreen={fullscreen}>
            <TimelineSC $fullscreen={fullscreen}>
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
                const color = traceColor(theme, traceSeverity(row.span.tags))

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
                      />
                    </TraceBarAreaSC>
                  </TraceRowSC>
                )
              })}
            </TimelineSC>
            {selectedRow && (
              <TraceDetailSC $fullscreen={fullscreen}>
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

export function traceSeverity(tags: Nullable<Record<string, unknown>>) {
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

function traceColor(
  theme: DefaultTheme,
  severity: ReturnType<typeof traceSeverity>
) {
  switch (severity) {
    case 'danger':
      return { accent: theme.colors.red[400], fill: theme.colors.red[800] }
    case 'warning':
      return {
        accent: theme.colors.yellow[400],
        fill: theme.colors.yellow[800],
      }
    default:
      return {
        accent: theme.colors.green[400],
        fill: theme.colors.green[800],
      }
  }
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
  ({ theme, $fullscreen }) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.small,
    minWidth: 0,
    width: '100%',
    ...($fullscreen && { height: '100%' }),
  })
)

const TraceToolbarSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.small,
  justifyContent: 'space-between',
}))

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
    ...theme.partials.text.buttonSmall,
    background: $active ? theme.colors['fill-three'] : 'transparent',
    borderRadius: theme.borderRadiuses.medium,
    color: theme.colors['text-light'],
    cursor: $active ? 'default' : 'pointer',
    minHeight: 28,
    padding: `0 ${theme.spacing.xsmall}px`,
    '@media (max-width: 720px)': {
      flex: 1,
    },
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

const TraceTimelineContentSC = styled.div<{ $fullscreen: boolean }>(
  ({ theme, $fullscreen }) => ({
    display: 'flex',
    flexDirection: $fullscreen ? 'row' : 'column',
    gap: theme.spacing.small,
    minHeight: 0,
    '@media (max-width: 720px)': {
      flexDirection: 'column',
    },
  })
)

const TimelineSC = styled.div<{ $fullscreen: boolean }>(
  ({ theme, $fullscreen }) => ({
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadiuses.medium,
    flex: $fullscreen ? 1 : undefined,
    maxHeight: $fullscreen ? 'calc(100vh - 136px)' : 360,
    overflowX: 'hidden',
    overflowY: 'auto',
    '@media (max-width: 720px)': {
      maxHeight: $fullscreen ? 'calc(100vh - 280px)' : 360,
    },
  })
)

const TimelineHeaderSC = styled.div(({ theme }) => ({
  background: theme.colors['fill-two'],
  borderBottom: `1px solid ${theme.colors.border}`,
  display: 'grid',
  gridTemplateColumns: 'minmax(140px, 38%) minmax(0, 1fr)',
  minHeight: 28,
  padding: `0 ${theme.spacing.small}px`,
  position: 'sticky',
  top: 0,
  zIndex: 1,
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
  $accent: string
  $fill: string
  $left: number
  $width: number
}>(({ theme, $accent, $fill, $left, $width }) => ({
  background: $fill,
  borderLeft: `3px solid ${$accent}`,
  borderRadius: theme.borderRadiuses.medium,
  height: 14,
  left: `${$left}%`,
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  width: `${$width}%`,
}))

const TraceDetailSC = styled.div<{ $fullscreen: boolean }>(
  ({ theme, $fullscreen }) => ({
    background: theme.colors['fill-two'],
    border: `1px solid ${theme.colors['border-fill-two']}`,
    borderRadius: theme.borderRadiuses.medium,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.small,
    maxHeight: $fullscreen ? 'calc(100vh - 136px)' : undefined,
    overflowY: $fullscreen ? 'auto' : undefined,
    padding: theme.spacing.small,
    width: $fullscreen ? 260 : undefined,
    '@media (max-width: 720px)': {
      maxHeight: 'none',
      width: 'auto',
    },
  })
)

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
