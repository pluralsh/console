import { CSSProperties, ReactNode, useEffect, useRef } from 'react'

function InfiniteScroller({
  loading = false,
  hasMore = false,
  loadMore,
  loadMoreArgs,
  children,
  ...props
}: {
  loading?: boolean
  hasMore?: boolean
  loadMore: (args: any) => void
  loadMoreArgs: any
  children: ReactNode
} & CSSProperties) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isScrollbarVisible = (el) => el.scrollHeight > el.clientHeight

  useEffect(() => {
    const { current } = scrollRef

    if (!current) return

    if (!isScrollbarVisible(current) && hasMore && !loading) {
      loadMore(loadMoreArgs)
    }

    function handleScroll(event) {
      if (
        typeof loadMore === 'function' &&
        !loading &&
        hasMore &&
        Math.abs(
          event.target.scrollTop -
            (event.target.scrollHeight - event.target.offsetHeight)
        ) < 32
      ) {
        loadMore(loadMoreArgs)
      }
    }

    current.addEventListener('scroll', handleScroll)

    return () => {
      current.removeEventListener('scroll', handleScroll)
    }
  }, [loading, hasMore, loadMore, loadMoreArgs])

  return (
    <div
      ref={scrollRef}
      css={{
        overflowY: 'auto',
        ...props,
      }}
    >
      {children}
    </div>
  )
}

export default InfiniteScroller
