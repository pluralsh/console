import { EmptyState, Flex, Spinner } from '@pluralsh/design-system'
import { isNil } from 'lodash'
import { useCallback, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import styled, { DefaultTheme } from 'styled-components'

// Shared building blocks for the workbench Board views (issues, jobs, alerts).

export function useBoardLoadMore({
  fetchingMore,
  hasNextPage,
  fetchNextPage,
}: {
  fetchingMore: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
}) {
  const fetchingRef = useRef(false)

  useEffect(() => {
    if (!fetchingMore) fetchingRef.current = false
  }, [fetchingMore])

  return useCallback(() => {
    if (fetchingRef.current || fetchingMore || !hasNextPage) return
    fetchingRef.current = true
    fetchNextPage()
  }, [fetchNextPage, fetchingMore, hasNextPage])
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

// 3 card columns, 2 below the desktop breakpoint.
export const BoardCardGridSC = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: theme.spacing.medium,
  [`@media (max-width: ${theme.breakpoints.desktop}px)`]: {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
}))

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

// Whole-card click target without nesting the card's own links and buttons
// inside a link or button: an invisible full-size target sits under the
// content, and interactive parts are raised above it with `CardRaisedSC`.
export const clickableCardStyles = (theme: DefaultTheme) =>
  ({
    position: 'relative',
    cursor: 'pointer',
    '&:hover': { backgroundColor: theme.colors['fill-one-hover'] },
    // hovering a control inside the card (not the card target, which is a
    // direct child) shouldn't highlight the whole card
    '&:has(> :not(a, button) :is(a, button, [data-clickable="true"]):hover)': {
      backgroundColor: theme.colors['fill-one'],
    },
  }) as const

const cardTargetStyles = (theme: DefaultTheme) =>
  ({
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    borderRadius: 'inherit',
    '&:focus-visible': { outline: theme.borders['outline-focused'] },
  }) as const

export const CardTargetLinkSC = styled(Link)(({ theme }) =>
  cardTargetStyles(theme)
)

export const CardTargetButtonSC = styled.button(({ theme }) => ({
  all: 'unset',
  cursor: 'pointer',
  ...cardTargetStyles(theme),
}))

// Raised above the card target; only its direct children take clicks, so the
// gaps between them still open the card.
export const CardRaisedSC = styled.div({
  position: 'relative',
  zIndex: 1,
  pointerEvents: 'none',
  '& > *': { pointerEvents: 'auto' },
})

const LoadMoreSentinelSC = styled.div({
  height: 1,
})
