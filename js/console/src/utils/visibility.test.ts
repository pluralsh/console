import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { onReturnToTab } from './visibility'

describe('onReturnToTab', () => {
  let visibility: ReturnType<typeof vi.spyOn>
  const setVisibility = (state: DocumentVisibilityState) => {
    visibility.mockReturnValue(state)
    document.dispatchEvent(new Event('visibilitychange'))
  }

  beforeEach(() => {
    vi.useFakeTimers()
    visibility = vi.spyOn(document, 'visibilityState', 'get')
    visibility.mockReturnValue('visible')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('calls back once the tab is shown after being hidden long enough', () => {
    const callback = vi.fn()
    const stop = onReturnToTab(callback, 5_000)

    setVisibility('hidden')
    vi.advanceTimersByTime(5_000)
    setVisibility('visible')
    expect(callback).toHaveBeenCalledTimes(1)

    setVisibility('visible')
    expect(callback).toHaveBeenCalledTimes(1)
    stop()
  })

  it('ignores brief tab switches', () => {
    const callback = vi.fn()
    const stop = onReturnToTab(callback, 5_000)

    setVisibility('hidden')
    vi.advanceTimersByTime(1_000)
    setVisibility('visible')
    expect(callback).not.toHaveBeenCalled()
    stop()
  })

  it('stops listening once cleaned up', () => {
    const callback = vi.fn()
    onReturnToTab(callback)()

    setVisibility('hidden')
    setVisibility('visible')
    expect(callback).not.toHaveBeenCalled()
  })
})
