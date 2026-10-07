import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSlicePolling } from './tableFetchHelpers'

const INTERVAL = 1000
const PAGE_SIZE = 2
const KEY_PATH = ['workbench', 'runs']

function connection(count: number, offset = 0) {
  return {
    pageInfo: { hasNextPage: true, endCursor: `cursor-${offset + count}` },
    edges: Array.from({ length: count }, (_, i) => ({
      node: { id: `job-${offset + i}` },
    })),
  }
}

// `useFetchPaginatedData` passes data already reduced to the connection parent
function queryResult(loadedCount: number) {
  return {
    loading: false,
    data: { runs: connection(loadedCount) },
    variables: { first: PAGE_SIZE },
    refetch: vi.fn(),
    fetchMore: vi.fn(),
  } as any
}

function poll(
  result: ReturnType<typeof queryResult>,
  virtualSlice?: { start?: { index: number }; end?: { index: number } }
) {
  renderHook(() =>
    useSlicePolling(result, {
      interval: INTERVAL,
      keyPath: KEY_PATH,
      pageSize: PAGE_SIZE,
      virtualSlice: virtualSlice as any,
    })
  )
  act(() => {
    vi.advanceTimersByTime(INTERVAL)
  })
}

describe('useSlicePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('refetches the first page when only one page is loaded', () => {
    const result = queryResult(PAGE_SIZE)
    poll(result)

    expect(result.refetch).toHaveBeenCalledTimes(1)
    expect(result.fetchMore).not.toHaveBeenCalled()
  })

  it('polls all loaded items for lists without a virtual slice', () => {
    const result = queryResult(5)
    poll(result)

    expect(result.refetch).not.toHaveBeenCalled()
    expect(result.fetchMore).toHaveBeenCalledTimes(1)
    expect(result.fetchMore.mock.calls[0][0].variables).toEqual({
      first: 5,
      after: null,
    })
  })

  it('replaces the loaded connection with the polled one', () => {
    const result = queryResult(5)
    poll(result)

    const { updateQuery } = result.fetchMore.mock.calls[0][0]
    const prev = { workbench: { id: 'wb', runs: connection(5) } }
    const polled = { workbench: { id: 'wb', runs: connection(5, 1) } }

    expect(updateQuery(prev, { fetchMoreResult: polled })).toEqual({
      workbench: { id: 'wb', runs: connection(5, 1) },
    })
    expect(updateQuery(prev, { fetchMoreResult: undefined })).toBe(prev)
  })

  it('caps the polled items at 3 pages', () => {
    const result = queryResult(8)
    poll(result)

    expect(result.fetchMore.mock.calls[0][0].variables).toEqual({
      first: 3 * PAGE_SIZE,
      after: null,
    })
  })

  it('keeps items beyond the cap and the cursor for loading more', () => {
    const result = queryResult(8)
    poll(result)

    const { updateQuery } = result.fetchMore.mock.calls[0][0]
    const loaded = connection(8)
    const prev = { workbench: { id: 'wb', runs: loaded } }
    // a new job arrived at the top, so job-5 drops out of the polled head
    const polledHead = {
      pageInfo: { hasNextPage: true, endCursor: 'cursor-polled' },
      edges: [{ node: { id: 'job-new' } }, ...loaded.edges.slice(0, 5)],
    }
    const polled = { workbench: { id: 'wb', runs: polledHead } }

    expect(updateQuery(prev, { fetchMoreResult: polled })).toEqual({
      workbench: {
        id: 'wb',
        runs: {
          pageInfo: loaded.pageInfo,
          edges: [...polledHead.edges, ...loaded.edges.slice(5)],
        },
      },
    })
  })

  it('drops items removed from the polled head', () => {
    const result = queryResult(8)
    poll(result)

    const { updateQuery } = result.fetchMore.mock.calls[0][0]
    const loaded = connection(8)
    const prev = { workbench: { id: 'wb', runs: loaded } }
    // job-2 was deleted, so the polled head reaches job-6
    const polledHead = {
      pageInfo: { hasNextPage: true, endCursor: 'cursor-polled' },
      edges: loaded.edges.filter(({ node }) => node.id !== 'job-2').slice(0, 6),
    }
    const polled = { workbench: { id: 'wb', runs: polledHead } }

    expect(
      updateQuery(prev, { fetchMoreResult: polled }).workbench.runs.edges
    ).toEqual([...polledHead.edges, ...loaded.edges.slice(7)])
  })

  it('keeps refetching the first page for virtualized tables at the top', () => {
    const result = queryResult(5)
    poll(result, { start: { index: 0 }, end: { index: 10 } })

    expect(result.refetch).toHaveBeenCalledTimes(1)
    expect(result.fetchMore).not.toHaveBeenCalled()
  })
})
