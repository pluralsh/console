import { RefObject, useCallback, useEffect, useRef } from 'react'

// how close to the bottom still counts as following along
const PINNED_THRESHOLD = 80

// keeps a scroll container at its bottom while its content grows (streamed text, expanding
// tool calls) or its viewport shrinks (a growing composer or error banner), until the user
// scrolls away; scrolling back down resumes following
export function useFollowBottom(
  scrollRef: RefObject<Nullable<HTMLElement>>,
  contentRef: RefObject<Nullable<HTMLElement>>,
  { enabled = true, initiallyPinned = true } = {}
) {
  const pinned = useRef(initiallyPinned)

  useEffect(() => {
    const el = scrollRef.current
    const content = contentRef.current
    if (!enabled || !el || !content) return
    let lastTop = el.scrollTop
    // only an upward scroll unpins: scroll events land a frame late, by which time streamed
    // content may have grown again past the threshold of a follow that did reach the bottom
    const onScroll = () => {
      const nearBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < PINNED_THRESHOLD
      if (el.scrollTop < lastTop) pinned.current = nearBottom
      else if (nearBottom) pinned.current = true
      lastTop = el.scrollTop
    }
    const follow = () => {
      if (pinned.current) el.scrollTop = el.scrollHeight
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    const observer = new ResizeObserver(follow)
    observer.observe(content)
    observer.observe(el)
    follow()
    return () => {
      el.removeEventListener('scroll', onScroll)
      observer.disconnect()
    }
  }, [scrollRef, contentRef, enabled])

  // jump to the bottom and follow again, eg after the user sends a prompt
  return useCallback(() => {
    pinned.current = true
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [scrollRef])
}
