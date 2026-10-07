import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  extendNestedConnection,
  isStaleResponse,
  MAX_POLLED_ITEMS,
  useSlicePolling,
} from './tableFetchHelpers'

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
    observable: { variables: { id: 'wb', first: PAGE_SIZE } },
    refetch: vi.fn(),
    fetchMore: vi.fn(),
  } as any
}

function poll(
  result: ReturnType<typeof queryResult>,
  {
    virtualSlice,
    keepLoadedPages = false,
  }: {
    virtualSlice?: { start?: { index: number }; end?: { index: number } }
    keepLoadedPages?: boolean
  } = {}
) {
  renderHook(() =>
    useSlicePolling(result, {
      interval: INTERVAL,
      keyPath: KEY_PATH,
      pageSize: PAGE_SIZE,
      virtualSlice: virtualSlice as any,
      keepLoadedPages,
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

  it("refetches the first page of lists that don't keep loaded pages", () => {
    const result = queryResult(5)
    poll(result)

    expect(result.refetch).toHaveBeenCalledTimes(1)
    expect(result.fetchMore).not.toHaveBeenCalled()
  })

  it('refetches the first page when only one page is loaded', () => {
    const result = queryResult(PAGE_SIZE)
    poll(result, { keepLoadedPages: true })

    expect(result.refetch).toHaveBeenCalledTimes(1)
    expect(result.fetchMore).not.toHaveBeenCalled()
  })

  it('polls every loaded item for lists keeping loaded pages', () => {
    const result = queryResult(5)
    poll(result, { keepLoadedPages: true })

    expect(result.refetch).not.toHaveBeenCalled()
    expect(result.fetchMore).toHaveBeenCalledTimes(1)
    expect(result.fetchMore.mock.calls[0][0].variables).toEqual({
      first: 5,
      after: null,
    })
  })

  it('replaces the loaded data with the polled one', () => {
    const result = queryResult(5)
    poll(result, { keepLoadedPages: true })

    const { updateQuery } = result.fetchMore.mock.calls[0][0]
    const prev = { workbench: { id: 'wb', counts: 1, runs: connection(5) } }
    const polled = {
      workbench: { id: 'wb', counts: 2, runs: connection(4, 1) },
    }

    const sent = { id: 'wb', first: 5, after: null }

    expect(
      updateQuery(prev, { fetchMoreResult: polled, variables: sent })
    ).toBe(polled)
    expect(
      updateQuery(prev, { fetchMoreResult: undefined, variables: sent })
    ).toBe(prev)
  })

  it('drops a poll sent before the list variables changed', () => {
    const result = queryResult(5)
    poll(result, { keepLoadedPages: true })

    const { updateQuery } = result.fetchMore.mock.calls[0][0]
    const prev = { workbench: { id: 'wb', runs: connection(5) } }
    const polled = { workbench: { id: 'wb', runs: connection(5, 1) } }
    // e.g. a search was typed while the poll was in flight
    result.observable.variables = { id: 'wb', first: PAGE_SIZE, q: 'x' }

    expect(
      updateQuery(prev, {
        fetchMoreResult: polled,
        variables: { id: 'wb', first: 5, after: null },
      })
    ).toBe(prev)
  })

  it('skips a poll when a page loaded while it was in flight', () => {
    const result = queryResult(5)
    poll(result, { keepLoadedPages: true })

    const { updateQuery } = result.fetchMore.mock.calls[0][0]
    const prev = { workbench: { id: 'wb', runs: connection(7) } }
    const polled = { workbench: { id: 'wb', runs: connection(5) } }

    expect(
      updateQuery(prev, {
        fetchMoreResult: polled,
        variables: { id: 'wb', first: 5, after: null },
      })
    ).toBe(prev)
  })

  it('pauses past the polled items ceiling', () => {
    const result = queryResult(MAX_POLLED_ITEMS + 1)
    poll(result, { keepLoadedPages: true })

    expect(result.refetch).not.toHaveBeenCalled()
    expect(result.fetchMore).not.toHaveBeenCalled()
  })

  it('keeps polling the visible slice of virtualized tables', () => {
    const result = queryResult(MAX_POLLED_ITEMS + 1)
    poll(result, {
      keepLoadedPages: true,
      virtualSlice: { start: { index: 0 }, end: { index: 10 } },
    })

    expect(result.refetch).toHaveBeenCalledTimes(1)
    expect(result.fetchMore).not.toHaveBeenCalled()
  })
})

describe('extendNestedConnection', () => {
  it('appends the page and takes counts and totals from it', () => {
    const prev = {
      workbench: {
        id: 'wb',
        counts: 1,
        runs: { ...connection(2), totalCount: 4 },
      },
    }
    const page = {
      workbench: {
        id: 'wb',
        counts: 2,
        runs: { ...connection(2, 2), totalCount: 5 },
      },
    }

    expect(extendNestedConnection(KEY_PATH, prev, page)).toEqual({
      workbench: {
        id: 'wb',
        counts: 2,
        runs: {
          totalCount: 5,
          pageInfo: page.workbench.runs.pageInfo,
          edges: [...prev.workbench.runs.edges, ...page.workbench.runs.edges],
        },
      },
    })
  })
})

describe('isStaleResponse', () => {
  const observable = { variables: { id: 'wb', first: 50, q: undefined } }

  it('ignores page variables and unset ones', () => {
    expect(
      isStaleResponse(observable, { id: 'wb', first: 120, after: null })
    ).toBe(false)
  })

  it('flags responses sent for other list variables', () => {
    expect(isStaleResponse(observable, { id: 'wb', first: 50, q: 'x' })).toBe(
      true
    )
    expect(isStaleResponse(observable, { id: 'other', first: 50 })).toBe(true)
  })
})
