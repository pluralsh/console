import { render } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useFollowBottom } from './useFollowBottom'

let resize: () => void
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(cb: () => void) {
        resize = cb
      }
      observe() {}
      disconnect() {}
    }
  )
})
afterEach(() => vi.unstubAllGlobals())

// jsdom has no layout, so the scroll geometry is faked on the element
function setup(initiallyPinned = true) {
  let scroller!: HTMLDivElement
  function Pane() {
    const scrollRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)
    useFollowBottom(scrollRef, contentRef, { initiallyPinned })
    return (
      <div
        ref={(el) => {
          scrollRef.current = el
          if (el) scroller = el
        }}
      >
        <div ref={contentRef} />
      </div>
    )
  }
  const geometry = { scrollHeight: 1000, clientHeight: 400 }
  render(<Pane />)
  Object.defineProperty(scroller, 'scrollHeight', {
    get: () => geometry.scrollHeight,
  })
  Object.defineProperty(scroller, 'clientHeight', {
    get: () => geometry.clientHeight,
  })
  const grow = (by: number) => {
    geometry.scrollHeight += by
    resize()
  }
  const scrollTo = (top: number) => {
    scroller.scrollTop = top
    scroller.dispatchEvent(new Event('scroll'))
  }
  return { scroller, grow, scrollTo }
}

describe('useFollowBottom', () => {
  it('follows streamed growth until the user scrolls up, and resumes at the bottom', () => {
    const { scroller, grow, scrollTo } = setup()
    grow(500)
    expect(scroller.scrollTop).toBe(1500)

    // a late scroll event from that follow, after more text arrived, doesn't unpin
    grow(300)
    scrollTo(1500)
    grow(100)
    expect(scroller.scrollTop).toBe(1900)

    scrollTo(500)
    grow(200)
    expect(scroller.scrollTop).toBe(500)

    scrollTo(1700)
    grow(50)
    expect(scroller.scrollTop).toBe(2150)
  })

  it('holds a deep-linked position', () => {
    const { scroller, grow } = setup(false)
    scroller.scrollTop = 200
    grow(500)
    expect(scroller.scrollTop).toBe(200)
  })
})
