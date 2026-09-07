import { describe, expect, it } from 'vitest'
import { WorkbenchJobActivityTraceFragment } from 'generated/graphql'
import {
  formatDuration,
  formatOffset,
  formatSpanCount,
  httpStatusFromAttribute,
  orderTraceSpans,
  traceSeverity,
  traceStatusMessage,
  traceTreeMeta,
  traceTicks,
  traceBarPosition,
} from './WorkbenchJobTraces'

function trace(
  overrides: Partial<WorkbenchJobActivityTraceFragment>
): WorkbenchJobActivityTraceFragment {
  return {
    end: '2026-09-04T10:00:01Z',
    name: 'span',
    service: 'console',
    spanId: 'span',
    start: '2026-09-04T10:00:00Z',
    traceId: 'trace',
    ...overrides,
  }
}

describe('orderTraceSpans', () => {
  it('orders children below their parent while keeping root spans chronological', () => {
    const rows = orderTraceSpans([
      trace({
        name: 'second root',
        spanId: 'root-2',
        start: '2026-09-04T10:00:20Z',
      }),
      trace({
        name: 'child',
        parentId: 'root-1',
        spanId: 'child',
        start: '2026-09-04T10:00:10Z',
      }),
      trace({ name: 'first root', spanId: 'root-1' }),
    ])

    expect(rows.map(({ span }) => span.name)).toEqual([
      'first root',
      'child',
      'second root',
    ])
    expect(rows.map(({ depth }) => depth)).toEqual([0, 1, 0])
  })

  it('omits spans without a usable duration', () => {
    const rows = orderTraceSpans([
      trace({ name: 'valid' }),
      trace({ name: 'invalid', spanId: 'invalid', start: 'not-a-date' }),
    ])

    expect(rows.map(({ span }) => span.name)).toEqual(['valid'])
  })
})

describe('traceSeverity', () => {
  it.each([
    [{ 'otel.status_code': 'ERROR' }, 'danger'],
    [{ error: true }, 'danger'],
    [{ 'http.response.status_code': 503 }, 'danger'],
    [{ status: 'WARN' }, 'warning'],
    [{ 'otel.status_code': 'OK' }, 'success'],
    [undefined, 'success'],
  ])('maps %o to %s', (tags, severity) => {
    expect(traceSeverity(tags)).toBe(severity)
  })
})

describe('traceTreeMeta', () => {
  it('marks ancestor guides and children from span depth', () => {
    const rows = orderTraceSpans([
      trace({ name: 'root', spanId: 'root' }),
      trace({ name: 'child', parentId: 'root', spanId: 'child' }),
      trace({ name: 'leaf', parentId: 'child', spanId: 'leaf' }),
      trace({
        name: 'sibling',
        parentId: 'root',
        spanId: 'sibling',
        start: '2026-09-04T10:00:02Z',
      }),
    ])

    expect(traceTreeMeta(rows)).toEqual([
      { ancestorContinues: [], hasChildren: true },
      { ancestorContinues: [true], hasChildren: true },
      { ancestorContinues: [true, false], hasChildren: false },
      { ancestorContinues: [false], hasChildren: false },
    ])
  })
})

describe('traceStatusMessage', () => {
  it('prefers the OpenTelemetry status description', () => {
    expect(
      traceStatusMessage({
        'exception.message': 'boom',
        'otel.status_description': 'connection reset',
      })
    ).toBe('connection reset')
  })
})

describe('httpStatusFromAttribute', () => {
  it('reads numeric HTTP status attributes', () => {
    expect(httpStatusFromAttribute('http.response.status_code', 200)).toBe(200)
    expect(httpStatusFromAttribute('status code', '503')).toBe(503)
    expect(httpStatusFromAttribute('http.route', '/gql')).toBeUndefined()
  })
})

describe('formatSpanCount', () => {
  it('uses the singular label for one span', () => {
    expect(formatSpanCount(1)).toBe('1 span')
  })

  it('uses the plural label for multiple spans', () => {
    expect(formatSpanCount(2)).toBe('2 spans')
  })
})

describe('formatDuration', () => {
  it('formats milliseconds without a space', () => {
    expect(formatDuration(52.4)).toBe('52ms')
  })

  it('formats seconds with two decimal places', () => {
    expect(formatDuration(4230)).toBe('4.23s')
  })
})

describe('formatOffset', () => {
  it('clamps negative offsets to the root', () => {
    expect(formatOffset(-2)).toBe('+0ms')
  })
})

describe('timeline scale', () => {
  it('aligns a child starting halfway through the trace with the middle tick', () => {
    const [row] = orderTraceSpans([
      trace({ start: '2026-09-04T10:00:00.500Z' }),
    ])
    const bounds = { start: row.start - 500, end: row.end }
    const ticks = traceTicks(bounds)

    expect(ticks[2]).toEqual({ offset: 500, position: 50 })
    expect(traceBarPosition(row, bounds)).toEqual({ left: 50, width: 50 })
    expect(ticks.at(-1)).toEqual({ offset: 1000, position: 100 })
  })

  it('keeps a zero-duration span visible without invalid coordinates', () => {
    const [row] = orderTraceSpans([trace({ end: '2026-09-04T10:00:00Z' })])
    const bounds = { start: row.start, end: row.end }

    expect(traceBarPosition(row, bounds)).toEqual({ left: 0, width: 0.75 })
    expect(traceTicks(bounds).every(({ offset }) => offset === 0)).toBe(true)
  })
})
