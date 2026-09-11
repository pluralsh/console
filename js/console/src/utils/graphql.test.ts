import { describe, expect, it } from 'vitest'
import { mergeConnectionsByNodeId } from './graphql'

const options = {
  readField: (_field, node) => node?.id,
}

describe('mergeConnectionsByNodeId', () => {
  it('preserves subscription edges missing from a stale poll response', () => {
    const existing = {
      edges: [{ node: { id: 'old' } }, { node: { id: 'subscribed' } }],
      pageInfo: { hasNextPage: false },
    }
    const incoming = {
      edges: [{ node: { id: 'old' } }],
      pageInfo: { hasNextPage: true },
    }

    expect(
      mergeConnectionsByNodeId(existing, incoming, options).edges.map(
        (edge) => edge.node.id
      )
    ).toEqual(['old', 'subscribed'])
  })

  it('prefers incoming edges when an activity is present in both', () => {
    const existing = {
      edges: [{ node: { id: 'activity', status: 'running' } }],
    }
    const incoming = {
      edges: [{ node: { id: 'activity', status: 'successful' } }],
    }

    expect(mergeConnectionsByNodeId(existing, incoming, options)).toEqual(
      incoming
    )
  })
})
