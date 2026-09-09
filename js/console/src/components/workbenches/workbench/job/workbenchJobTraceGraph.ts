import { type Edge } from '@xyflow/react'
import { WorkbenchJobActivityTraceFragment } from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { formatDuration } from './workbenchJobTraceUtils'
import { traceBarColor } from './workbenchJobTraceColors'

const smoothEdgeType = 'plural-smooth-edge'

export type TraceGraphSpan = Pick<
  WorkbenchJobActivityTraceFragment,
  'end' | 'name' | 'parentId' | 'service' | 'spanId' | 'start' | 'tags'
>

export type TraceGraphNodeData = {
  color: string
  count?: number
  duration: number
  label: string
  service: string
  severity: 'danger' | 'success' | 'warning'
  tool?: boolean
}

export function getSpanNodesAndEdges(spans: TraceGraphSpan[]) {
  const validSpans = spans.map(toSpanData).filter(isNonNullable)
  const spanIdToNodeId = new Map<string, string>()
  const nodes = validSpans.map(({ duration, index, span }) => {
    const id = `span:${span.spanId ?? index}`
    if (span.spanId) spanIdToNodeId.set(span.spanId, id)

    return {
      data: {
        color: serviceColor(serviceName(span)),
        duration,
        label: span.name ?? 'Unnamed span',
        service: serviceName(span),
        severity: nodeSeverity(span.tags),
        tool: isToolSpan(span.tags),
      },
      id,
      position: { x: 0, y: 0 },
      type: 'trace' as const,
    }
  })
  const edges = validSpans.flatMap(({ index, span }) => {
    const source = span.parentId ? spanIdToNodeId.get(span.parentId) : undefined
    const target = `span:${span.spanId ?? index}`
    if (!source || source === target) return []

    return [traceEdge(source, target)]
  })

  return { edges, nodes }
}

export function getServiceNodesAndEdges(spans: TraceGraphSpan[]) {
  const validSpans = spans.map(toSpanData).filter(isNonNullable)
  const spanById = new Map(
    validSpans
      .filter(({ span }) => !!span.spanId)
      .map(({ span }) => [span.spanId!, span])
  )
  const services = new Map<
    string,
    {
      duration: number
      severity: TraceGraphNodeData['severity']
      spans: TraceGraphSpan[]
    }
  >()

  validSpans.forEach(({ duration, span }) => {
    const service = serviceName(span)
    const current = services.get(service) ?? {
      duration: 0,
      severity: 'success' as const,
      spans: [],
    }
    services.set(service, {
      duration: current.duration + duration,
      severity: worseSeverity(current.severity, nodeSeverity(span.tags)),
      spans: [...current.spans, span],
    })
  })

  const nodes = [...services.entries()].map(([service, value]) => ({
    data: {
      color: serviceColor(service),
      count: value.spans.length,
      duration: value.duration,
      label: service,
      service,
      severity: value.severity,
    },
    id: `service:${service}`,
    position: { x: 0, y: 0 },
    type: 'trace' as const,
  }))
  const connections = new Map<
    string,
    { source: string; target: string; count: number; duration: number }
  >()
  validSpans.forEach(({ span, duration }) => {
    const parent = span.parentId ? spanById.get(span.parentId) : undefined
    if (!parent) return

    const source = `service:${serviceName(parent)}`
    const target = `service:${serviceName(span)}`
    if (source === target) return
    const id = `${source}->${target}`
    const current = connections.get(id)
    connections.set(id, {
      source,
      target,
      count: (current?.count ?? 0) + 1,
      duration: (current?.duration ?? 0) + duration,
    })
  })
  const edges = [...connections.values()].map(
    ({ source, target, count, duration }) => ({
      ...traceEdge(source, target),
      label: `${count} sent • ${formatDuration(duration / count)}`,
    })
  )

  return { edges, nodes }
}

export function getServices(spans: TraceGraphSpan[]) {
  return [...new Set(spans.map(serviceName))].map((name) => ({
    color: serviceColor(name),
    name,
  }))
}

function toSpanData(span: TraceGraphSpan, index: number) {
  const start = timestamp(span.start)
  const end = timestamp(span.end)
  if (start == null || end == null) return null

  return { duration: Math.max(0, end - start), index, span }
}

function traceEdge(source: string, target: string): Edge {
  return {
    id: `${source}->${target}`,
    source,
    target,
    type: smoothEdgeType,
  }
}

function serviceName(span: TraceGraphSpan) {
  return span.service ?? 'Unknown service'
}

function timestamp(value: Nullable<string>) {
  if (!value) return null
  const result = new Date(value).getTime()
  return Number.isNaN(result) ? null : result
}

function nodeSeverity(
  tags: Nullable<Record<string, unknown>>
): TraceGraphNodeData['severity'] {
  if (!tags) return 'success'

  const status = String(
    tags['otel.status_code'] ?? tags['status.code'] ?? tags.status ?? ''
  ).toLowerCase()
  const httpStatus = Number(
    tags['http.response.status_code'] ?? tags['http.status_code']
  )

  if (
    tags.error ||
    tags['error.type'] ||
    status === 'error' ||
    httpStatus >= 500
  )
    return 'danger'
  if (status === 'warning' || status === 'warn') return 'warning'

  return 'success'
}

function worseSeverity(
  current: TraceGraphNodeData['severity'],
  next: TraceGraphNodeData['severity']
) {
  if (current === 'danger' || next === 'danger') return 'danger'
  if (current === 'warning' || next === 'warning') return 'warning'

  return 'success'
}

function isToolSpan(tags: Nullable<Record<string, unknown>>) {
  return !!tags && Object.keys(tags).some((key) => /tool/i.test(key))
}

function serviceColor(service: string) {
  return traceBarColor(service).accent
}
