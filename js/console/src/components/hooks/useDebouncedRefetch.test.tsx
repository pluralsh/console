import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

import { useDebouncedRefetch } from './useDebouncedRefetch'

describe('useDebouncedRefetch', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('coalesces a burst into one refetch', () => {
    const refetch = vi.fn()
    const { result } = renderHook(() => useDebouncedRefetch(refetch))

    result.current()
    result.current()
    vi.advanceTimersByTime(400)
    result.current()
    expect(refetch).not.toHaveBeenCalled()

    vi.advanceTimersByTime(500)
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('calls the latest refetch', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { result, rerender } = renderHook(
      ({ refetch }) => useDebouncedRefetch(refetch),
      { initialProps: { refetch: first } }
    )

    result.current()
    rerender({ refetch: second })
    vi.advanceTimersByTime(500)

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('does nothing without a refetch or after unmounting', () => {
    const refetch = vi.fn()
    const { result: noop } = renderHook(() => useDebouncedRefetch(null))
    noop.current()

    const { result, unmount } = renderHook(() => useDebouncedRefetch(refetch))
    result.current()
    unmount()
    vi.advanceTimersByTime(500)

    expect(refetch).not.toHaveBeenCalled()
  })
})
