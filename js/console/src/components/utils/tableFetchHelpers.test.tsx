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

  it('keeps refetching the first page for virtualized tables at the top', () => {
    const result = queryResult(5)
    poll(result, { start: { index: 0 }, end: { index: 10 } })

    expect(result.refetch).toHaveBeenCalledTimes(1)
    expect(result.fetchMore).not.toHaveBeenCalled()
  })
})
