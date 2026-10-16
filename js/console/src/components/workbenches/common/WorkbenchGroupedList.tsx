import { CaretDownIcon, PlusIcon, Spinner } from '@pluralsh/design-system'
import { useVirtualizer } from '@tanstack/react-virtual'
import chroma from 'chroma-js'
import { PageInfoFragment } from 'generated/graphql'
import { ReactNode, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import styled, { DefaultTheme } from 'styled-components'
import {
  BoardEmptyList,
  EmptyListState,
  useScrollMargin,
} from './WorkbenchBoard'

// Shared by the Linear-style List views of workbench issues and jobs: items
// grouped by status, each group paged on its own. A group's header sticks to
// the top while scrolling through it, until the next one takes over.

export const GROUP_ROW_HEIGHT = 44

type IconColor = keyof DefaultTheme['colors'] & `icon-${string}`

export type ListGroup<K extends string> = {
  key: K
  label: string
  icon: ReactNode
  // tints the header
  color: IconColor
  count: number
}

// Lists the groups (`undefined` until their counts load), in order. Only
// expanded groups render their body, so collapsed ones don't load or poll.
export function WorkbenchGroupedList<K extends string>({
  groups,
  loading,
  noun,
  emptyState,
  defaultCollapsed,
  renderGroup,
}: {
  groups: Nullable<ListGroup<K>[]>
  loading: boolean
  noun: string
  emptyState: EmptyListState
  defaultCollapsed?: Partial<Record<K, boolean>>
  renderGroup: (
    group: ListGroup<K>,
    scrollEl: HTMLDivElement | null
  ) => ReactNode
}) {
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const [collapsed, setCollapsed] = useState<Partial<Record<K, boolean>>>(
    () => defaultCollapsed ?? {}
  )

  if (!groups || groups.length === 0) {
    return (
      <BoardEmptyList
        noun={noun}
        loading={!groups && loading}
        emptyState={emptyState}
      />
    )
  }

  return (
    <ListSC ref={setScrollEl}>
      {groups.map((group) => {
        const isCollapsed = !!collapsed[group.key]

        return (
          <GroupSC key={group.key}>
            <GroupHeaderSC
              type="button"
              $color={group.color}
              onClick={() =>
                setCollapsed((prev) => ({
                  ...prev,
                  [group.key]: !prev[group.key],
                }))
              }
              aria-expanded={!isCollapsed}
            >
              <CaretDownIcon
                size={10}
                color="icon-xlight"
                css={{
                  transform: isCollapsed ? 'rotate(-90deg)' : undefined,
                  transition: 'transform 0.15s ease',
                }}
              />
              {group.icon}
              <span>{group.label}</span>
              <GroupCountSC>{group.count}</GroupCountSC>
            </GroupHeaderSC>
            {!isCollapsed && renderGroup(group, scrollEl)}
          </GroupSC>
        )
      })}
    </ListSC>
  )
}

// A group's rows, with a button loading its next page.
export function GroupedListBody<T>({
  items,
  loading,
  count,
  pageInfo,
  fetchingMore,
  fetchNextPage,
  scrollEl,
  getKey,
  renderRow,
}: {
  items: T[]
  // first load only (spinner); later fetches keep the rows
  loading: boolean
  // the group's total, to tell how many are left to load
  count: number
  pageInfo: Nullable<PageInfoFragment>
  fetchingMore: boolean
  fetchNextPage: () => void
  scrollEl: HTMLDivElement | null
  getKey: (item: T) => string
  renderRow: (item: T) => ReactNode
}) {
  if (loading) {
    return (
      <GroupLoadingSC>
        <Spinner />
      </GroupLoadingSC>
    )
  }

  return (
    <>
      <VirtualRows
        items={items}
        scrollEl={scrollEl}
        getKey={getKey}
        renderRow={renderRow}
      />
      {pageInfo?.hasNextPage && (
        <ViewMoreButton
          remaining={Math.max(count - items.length, 0)}
          endCursor={pageInfo.endCursor}
          fetchingMore={fetchingMore}
          fetchNextPage={fetchNextPage}
        />
      )}
    </>
  )
}

// Loads a group's next page on demand. Polls also show as `fetchingMore`, so
// it only spins for a page requested from the cursor it's still on.
function ViewMoreButton({
  remaining,
  endCursor,
  fetchingMore,
  fetchNextPage,
}: {
  remaining: number
  endCursor: Nullable<string>
  fetchingMore: boolean
  fetchNextPage: () => void
}) {
  const [requestedFrom, setRequestedFrom] = useState<Nullable<string>>()
  const loadingMore = fetchingMore && requestedFrom === endCursor

  return (
    <ViewMoreSC
      type="button"
      disabled={loadingMore}
      onClick={() => {
        setRequestedFrom(endCursor)
        fetchNextPage()
      }}
    >
      {loadingMore ? <Spinner size={14} /> : <PlusIcon size={14} />}
      View more
      {remaining > 0 && <GroupCountSC>{remaining}</GroupCountSC>}
    </ViewMoreSC>
  )
}

function VirtualRows<T>({
  items,
  scrollEl,
  getKey,
  renderRow,
}: {
  items: T[]
  scrollEl: HTMLDivElement | null
  getKey: (item: T) => string
  renderRow: (item: T) => ReactNode
}) {
  // TanStack Virtual returns mutable instances that can't be memoized safely
  'use no memo'
  const listRef = useRef<HTMLDivElement>(null)
  const scrollMargin = useScrollMargin(listRef, scrollEl)

  // oxlint-disable-next-line react/incompatible-library
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollEl,
    estimateSize: () => GROUP_ROW_HEIGHT,
    // it scrolls its element to this on mount, which would jump the shared list
    // to the top whenever a group is expanded
    initialOffset: () => scrollEl?.scrollTop ?? 0,
    overscan: 10,
    scrollMargin,
  })
  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div
      ref={listRef}
      css={{ position: 'relative', height: virtualizer.getTotalSize() }}
    >
      <div
        css={{ position: 'absolute', top: 0, left: 0, width: '100%' }}
        style={{
          transform: `translateY(${(virtualItems[0]?.start ?? 0) - scrollMargin}px)`,
        }}
      >
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index]

          return (
            item !== undefined && (
              <div key={getKey(item)}>{renderRow(item)}</div>
            )
          )
        })}
      </div>
    </div>
  )
}

const ListSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  width: '100%',
  minWidth: 0,
  minHeight: 0,
  overflowX: 'hidden',
  overflowY: 'auto',
})

// the sticky header's containing block, so the next group pushes it out
const GroupSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
})

// tinted with its status color, but opaque, so the rows scroll under it unseen.
// Light mode's zero fill is white on a near-white page, so it steps up there.
const GroupHeaderSC = styled.button<{ $color: IconColor }>(
  ({ theme, $color }) => {
    const light = theme.mode === 'light'
    const fill = theme.colors[light ? 'fill-two' : 'fill-zero']
    const hoverFill = theme.colors[light ? 'fill-two-hover' : 'fill-zero-hover']

    return {
      ...theme.partials.reset.button,
      ...theme.partials.text.body2Bold,
      position: 'sticky',
      top: 0,
      zIndex: 2,
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.small,
      height: 36,
      flexShrink: 0,
      marginBottom: theme.spacing.xxsmall,
      padding: `0 ${theme.spacing.medium}px`,
      color: theme.colors.text,
      backgroundColor: statusTint(fill, theme.colors[$color]),
      borderRadius: theme.borderRadiuses.large,
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: statusTint(hoverFill, theme.colors[$color]),
      },
      // only for keyboard focus, not after a click
      '&:focus': { outline: 'none' },
      '&:focus-visible': { outline: theme.borders['outline-focused'] },
    }
  }
)

function statusTint(fill: string, color: string) {
  try {
    return chroma.mix(fill, color, 0.04, 'rgb').hex()
  } catch {
    return fill
  }
}

const GroupCountSC = styled.span(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-xlight'],
}))

const GroupLoadingSC = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  padding: theme.spacing.medium,
}))

// laid out like a row, its icon in the rows' status icon column
const ViewMoreSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  ...theme.partials.text.body2,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  height: 36,
  flexShrink: 0,
  marginBottom: theme.spacing.small,
  padding: `0 ${theme.spacing.medium}px`,
  borderRadius: theme.borderRadiuses.large,
  color: theme.colors['text-light'],
  cursor: 'pointer',
  '&:hover:not(:disabled)': {
    backgroundColor: theme.colors['fill-zero-hover'],
    color: theme.colors.text,
  },
  '&:disabled': { cursor: 'default' },
  '&:focus-visible': { outline: theme.borders['outline-focused'] },
}))

// A row's parts: a full-row target (`GroupRowLinkSC` or `GroupRowAnchorSC`)
// under the content, with its links and chips raised above it.
export const GroupRowSC = styled.div(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  height: GROUP_ROW_HEIGHT,
  padding: `0 ${theme.spacing.medium}px`,
  borderRadius: theme.borderRadiuses.large,
  // the row's own target, not a link or chip in it
  '&:has(> a:hover)': { backgroundColor: theme.colors['fill-zero-hover'] },
}))

const rowTargetStyles = (theme: DefaultTheme) =>
  ({
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    '&:focus-visible': { outline: theme.borders['outline-focused'] },
  }) as const

export const GroupRowAnchorSC = styled.a(({ theme }) => rowTargetStyles(theme))

export const GroupRowLinkSC = styled(Link)(({ theme }) =>
  rowTargetStyles(theme)
)

export const GroupRowTitleSC = styled.span(({ theme }) => ({
  ...theme.partials.text.body2,
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: theme.colors.text,
  pointerEvents: 'none',
}))

export const GroupRowRaisedSC = styled.div(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  flexShrink: 0,
  maxWidth: '50%',
  minWidth: 0,
}))

export const GroupRowDateSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  flexShrink: 0,
  width: 48,
  textAlign: 'right',
  color: theme.colors['text-xlight'],
  pointerEvents: 'none',
}))
