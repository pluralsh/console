import { useEffect, useRef } from 'react'
import { Div } from 'honorable'

function InfiniteScroller({
  loading = false, hasMore = false, loadMore, loadMoreArgs, children, ...props
}: any) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isScrollbarVisible = el => el.scrollHeight > el.clientHeight

  useEffect(() => {
    const { current } = scrollRef

    if (!current) return

    if (!isScrollbarVisible(current) && hasMore && !loading) {
      console.log('loadmore111')
      loadMore(loadMoreArgs)
    }

    function handleScroll(event) {
      if (
        typeof loadMore === 'function'
        && !loading
        && hasMore
        && Math.abs(event.target.scrollTop - (event.target.scrollHeight - event.target.offsetHeight)) < 32
      ) {
        console.log('loadmore')
        loadMore(loadMoreArgs)
      }
    }

    current.addEventListener('scroll', handleScroll)

    return () => {
      current.removeEventListener('scroll', handleScroll)
    }
  }, [loading, hasMore, loadMore])

  return (
    <Div
      ref={scrollRef}
      overflowY="auto"
      {...props}
    >
      {children}
    </Div>
  )
}

export default InfiniteScroller
