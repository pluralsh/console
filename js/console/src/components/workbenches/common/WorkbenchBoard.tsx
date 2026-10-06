import { EmptyState, Flex, Spinner } from '@pluralsh/design-system'
import { isNil } from 'lodash'
import { useCallback, useEffect, useRef } from 'react'
import styled from 'styled-components'

// Shared building blocks for the workbench Board views (issues, jobs, alerts).

export function useBoardLoadMore({
  loading,
  hasNextPage,
  fetchNextPage,
}: {
  loading: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
}) {
  const fetchingRef = useRef(false)

  useEffect(() => {
    if (!loading) fetchingRef.current = false
  }, [loading])

  return useCallback(() => {
    if (fetchingRef.current || loading || !hasNextPage) return
    fetchingRef.current = true
    fetchNextPage()
  }, [fetchNextPage, hasNextPage, loading])
}

export function LoadMoreSentinel({ onVisible }: { onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (isNil(element)) return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) onVisible()
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [onVisible])

  return <LoadMoreSentinelSC ref={ref} />
}

// Spinner on the first load, then an empty state, for a view with no items.
export function BoardLoadingOrEmpty({
  loading,
  message,
}: {
  loading: boolean
  message: string
}) {
  return loading ? (
    <BoardCenteredSC>
      <Spinner />
    </BoardCenteredSC>
  ) : (
    <EmptyState message={message} />
  )
}

export const BoardCenteredSC = styled(Flex)({
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
})

export const BoardSectionSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  paddingBottom: theme.spacing.large,
}))

export const BoardSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  width: '100%',
  minWidth: 0,
  minHeight: 0,
  overflowX: 'hidden',
  overflowY: 'auto',
})

export const BoardTitleSC = styled.h2(({ theme }) => ({
  ...theme.partials.text.mono,
  fontSize: 18,
  fontWeight: 400,
  lineHeight: '24px',
  letterSpacing: 0,
  margin: 0,
  color: theme.colors.text,
}))

const LoadMoreSentinelSC = styled.div({
  height: 1,
})
