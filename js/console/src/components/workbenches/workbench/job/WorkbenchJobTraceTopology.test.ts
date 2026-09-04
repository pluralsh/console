import { describe, expect, it } from 'vitest'
import { WorkbenchJobActivityTraceFragment } from 'generated/graphql'
import {
  getServiceNodesAndEdges,
  getSpanNodesAndEdges,
} from './WorkbenchJobTraceTopology'

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

describe('trace topology', () => {
  it('connects child spans to their parent span', () => {
    const { edges } = getSpanNodesAndEdges([
      trace({ spanId: 'root' }),
      trace({ parentId: 'root', spanId: 'child' }),
    ])

    expect(edges).toHaveLength(1)
    expect(edges[0]).toMatchObject({
      source: 'span:root',
      target: 'span:child',
    })
  })

  it('aggregates cross-service calls and omits self-edges', () => {
    const { nodes, edges } = getServiceNodesAndEdges([
      trace({ service: 'console', spanId: 'root' }),
      trace({ parentId: 'root', service: 'console', spanId: 'local' }),
      trace({ parentId: 'root', service: 'postgres', spanId: 'query' }),
    ])

    expect(nodes).toHaveLength(2)
    expect(edges).toHaveLength(1)
    expect(edges[0]).toMatchObject({
      source: 'service:console',
      target: 'service:postgres',
    })
  })
})
