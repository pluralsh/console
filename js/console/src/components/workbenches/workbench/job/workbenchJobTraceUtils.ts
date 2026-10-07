import { WorkbenchJobActivityTraceFragment } from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'

export type TraceSpan = Pick<
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

export type TraceSeverity = 'danger' | 'success' | 'warning'

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

export function groupTraces(traces: TraceSpan[]) {
  const groups = new Map<string, TraceSpan[]>()
  traces.forEach((trace, index) => {
    const id = trace.traceId ?? `trace-${index}`
    groups.set(id, [...(groups.get(id) ?? []), trace])
  })

  return [...groups.entries()].map(([id, spans]) => ({ id, spans }))
}

export function traceBounds(rows: TraceRow[]) {
  if (!rows.length) return null

  return {
    end: Math.max(...rows.map(({ end }) => end)),
    start: Math.min(...rows.map(({ start }) => start)),
  }
}

export function traceTicks(bounds: { end: number; start: number }) {
  const duration = bounds.end - bounds.start

  return Array.from({ length: 5 }, (_, index) => ({
    offset: (duration * index) / 4,
    position: index * 25,
  }))
}

export function traceBarPosition(
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

export function formatDuration(duration: number) {
  const ms = Math.round(Math.max(0, duration))

  if (ms < 1_000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1_000).toFixed(2)}s`
  return `${(ms / 60_000).toFixed(1)}m`
}

export function formatOffset(duration: number) {
  return `+${formatDuration(duration)}`
}

export function serviceName(span: Pick<TraceSpan, 'service'>) {
  return span.service ?? 'unknown service'
}

export function formatSpanCount(count: number) {
  return `${count} ${count === 1 ? 'span' : 'spans'}`
}

export function shortTraceId(traceId: string) {
  return traceId.length > 12 ? `${traceId.slice(0, 12)}…` : traceId
}

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

export function httpStatusDot(status: number) {
  if (status >= 500) return '#E95374'
  if (status >= 400) return '#F6AD55'
  return '#99F5D5'
}

export function traceStatus(spans: TraceSpan[]): TraceSeverity {
  if (spans.some(({ tags }) => traceSeverity(tags) === 'danger'))
    return 'danger'
  if (spans.some(({ tags }) => traceSeverity(tags) === 'warning'))
    return 'warning'

  return 'success'
}

export function traceStatusLabel(severity: TraceSeverity) {
  switch (severity) {
    case 'danger':
      return 'Firing'
    case 'warning':
      return 'Warning'
    default:
      return 'Healthy'
  }
}

export function formatTagValue(value: unknown) {
  if (typeof value === 'string') return value
  if (value == null) return '—'
  return JSON.stringify(value) ?? String(value)
}
