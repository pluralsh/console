import { describe, expect, it } from 'vitest'
import { WorkbenchJobActivityTraceFragment } from 'generated/graphql'
import { orderTraceSpans } from './WorkbenchJobTraces'

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
