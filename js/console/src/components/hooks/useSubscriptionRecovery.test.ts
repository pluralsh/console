import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  SUBSCRIPTION_SETTLE_MS,
  useSubscriptionRecovery,
} from './useSubscriptionRecovery'

describe('useSubscriptionRecovery', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const setup = () => {
    const restart = vi.fn()
    const onRecover = vi.fn()
    const hook = renderHook(
      ({ error }: { error?: Error }) =>
        useSubscriptionRecovery({ error, restart }, { onRecover }),
      { initialProps: {} }
    )
    return { restart, onRecover, ...hook }
  }

  it('restarts an errored subscription and clears once it holds', () => {
    const { restart, onRecover, result, rerender } = setup()
    expect(result.current).toBe(false)

    rerender({ error: new Error('socket closed') })
    expect(result.current).toBe(true)
    act(() => vi.advanceTimersByTime(1000))
    expect(restart).toHaveBeenCalledTimes(1)

    // the restarted subscription's error reads clear, but it's not yet trusted
    rerender({})
    expect(result.current).toBe(true)
    act(() => vi.advanceTimersByTime(SUBSCRIPTION_SETTLE_MS))
    expect(result.current).toBe(false)
    expect(onRecover).toHaveBeenCalledTimes(1)
  })

  it('backs off while restarts keep failing', () => {
    const { restart, onRecover, result, rerender } = setup()

    rerender({ error: new Error('first') })
    act(() => vi.advanceTimersByTime(1000))
    expect(restart).toHaveBeenCalledTimes(1)

    rerender({})
    rerender({ error: new Error('again') })
    act(() => vi.advanceTimersByTime(1000))
    expect(restart).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersByTime(1000))
    expect(restart).toHaveBeenCalledTimes(2)
    expect(result.current).toBe(true)
    expect(onRecover).not.toHaveBeenCalled()
  })
})
