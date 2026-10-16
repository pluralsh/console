import { Button, EmptyState, Flex, Spinner } from '@pluralsh/design-system'
import { isNil } from 'lodash'
import {
  ReactNode,
  RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { Link } from 'react-router-dom'
import styled, { DefaultTheme } from 'styled-components'

// Shared building blocks for the workbench Board views (issues, jobs, alerts).

type LoadMoreProps = {
  // a page or poll in flight, to pace loading more
  fetchingMore: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
}

// `loadingMore` is only set for pages requested here, not for polls, which
// also show as `fetchingMore`. A failed request leaves it set, until retried.
function useBoardLoadMore({
  fetchingMore,
  hasNextPage,
  fetchNextPage,
}: LoadMoreProps) {
  const fetchingRef = useRef(false)
  // the page fetcher a page was requested with; a new page's cursor replaces it
  const [requestedWith, setRequestedWith] = useState<() => void>()

  // a new page (or a fetch that never showed as in flight) changes these
  useEffect(() => {
    if (!fetchingMore) fetchingRef.current = false
  }, [fetchingMore, fetchNextPage, hasNextPage])

  const onVisible = useCallback(() => {
    if (fetchingRef.current || fetchingMore || !hasNextPage) return
    fetchingRef.current = true
    setRequestedWith(() => fetchNextPage)
    fetchNextPage()
  }, [fetchNextPage, fetchingMore, hasNextPage])

  return { onVisible, loadingMore: requestedWith === fetchNextPage }
}

// Loads the next page once scrolled into view, while there is one.
export function LoadMoreSentinel(props: LoadMoreProps) {
  if (!props.hasNextPage) return null

  return <LoadMoreSentinelInner {...props} />
}

function LoadMoreSentinelInner(props: LoadMoreProps) {
  const { onVisible, loadingMore } = useBoardLoadMore(props)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (isNil(element)) return

    // observed against its scroll container, so the margin loads the next
    // page a bit before the end (the viewport root ignores ancestor clipping)
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) onVisible()
      },
      { root: scrollParent(element), rootMargin: '0px 0px 300px 0px' }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [onVisible])

  return (
    <>
      <LoadMoreSentinelSC ref={ref} />
      {loadingMore && (
        <LoadingMoreSC>
          <Spinner />
        </LoadingMoreSC>
      )}
    </>
  )
}

// A virtualized list's offset within its scroll container, for the
// virtualizer's `scrollMargin`. Content above it can grow or resize, but only
// the container's direct children are observed for that.
export function useScrollMargin(
  listRef: RefObject<HTMLDivElement | null>,
  scroller: HTMLDivElement | null
) {
  const [margin, setMargin] = useState(0)
  const measure = useCallback(() => {
    const list = listRef.current
    if (!list || !scroller) return

    setMargin(
      list.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top +
        scroller.scrollTop
    )
  }, [listRef, scroller])

  // sections above can appear (e.g. recent jobs loading) on any render
  useLayoutEffect(measure)

  // ...or resize, e.g. on a narrower window
  useLayoutEffect(() => {
    if (!scroller) return
    const observer = new ResizeObserver(measure)

    Array.from(scroller.children).forEach((child) => observer.observe(child))
    return () => observer.disconnect()
  }, [measure, scroller])

  return margin
}

function scrollParent(element: HTMLElement): HTMLElement | null {
  for (let el = element.parentElement; el; el = el.parentElement) {
    if (/auto|scroll/.test(getComputedStyle(el).overflowY)) return el
  }
  return null
}

// Spinner on the first load, then an empty state, for a view with no items.
// Names what emptied a list (the search, the display filters or both), so the
// message doesn't blame the wrong one.
export type EmptyListState = {
  // a (debounced) search is applied
  searching: boolean
  // the display filters narrow the list
  filtered: boolean
  onResetFilters: () => void
}

function emptyListMessage(
  noun: string,
  { searching, filtered }: { searching: boolean; filtered: boolean }
) {
  if (searching && filtered) return `No ${noun} match your search and filters.`
  if (searching) return `No matching ${noun} found.`
  if (filtered) return `No ${noun} match the current filters.`
  return `No ${noun} found.`
}

// The empty (or first loading) state of a list, naming what emptied it.
export function BoardEmptyList({
  noun,
  loading,
  emptyState: { searching, filtered, onResetFilters },
}: {
  noun: string
  loading: boolean
  emptyState: EmptyListState
}) {
  return loading ? (
    <BoardCenteredSC>
      <Spinner />
    </BoardCenteredSC>
  ) : (
    <EmptyState message={emptyListMessage(noun, { searching, filtered })}>
      {/* offers to reset the display filters, when they narrowed the list */}
      {filtered && (
        <Button
          small
          secondary
          onClick={onResetFilters}
        >
          Reset filters
        </Button>
      )}
    </EmptyState>
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

// a section title with its item count, e.g. "All jobs 291"; no count is shown
// until it's known
export function BoardTitle({
  children,
  count,
}: {
  children: ReactNode
  count?: Nullable<number>
}) {
  return (
    <BoardTitleSC>
      {children}
      {!isNil(count) && <BoardTitleCountSC>{count}</BoardTitleCountSC>}
    </BoardTitleSC>
  )
}

const BoardTitleCountSC = styled.span(({ theme }) => ({
  color: theme.colors['text-xlight'],
  marginLeft: theme.spacing.medium,
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

// a flex child that would otherwise shrink to 0px in an overflowing column
const LoadMoreSentinelSC = styled.div({
  height: 1,
  flexShrink: 0,
})

const LoadingMoreSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexShrink: 0,
  justifyContent: 'center',
  padding: `${theme.spacing.small}px 0 ${theme.spacing.large}px`,
}))
