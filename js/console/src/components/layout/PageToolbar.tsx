import { ArrowScroll, Input, SearchIcon } from '@pluralsh/design-system'
import { SubtabDirectory } from 'components/utils/SubTabs'
import { UnstyledLink } from 'components/utils/Link'
import {
  ComponentProps,
  createContext,
  ReactNode,
  Ref,
  useContext,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useParams } from 'react-router-dom'
import styled from 'styled-components'

// shared by the toolbar and the header rows of page sidebars, so inputs in
// both line up
export const PAGE_TOOLBAR_HEIGHT = 48

const SEARCH_WIDTH = 200
const SEARCH_EXPANDED_WIDTH = 360

// The bar under the header holding a page's tabs, its primary inputs and its
// actions. `heading` names the page's subject ahead of the tabs, `children` sit
// at the end of the bar and `start` right after the tabs. Pass `slotRef` to let
// nested routes render into the bar through `PageToolbarPortal`, ahead of
// `children`.
export function PageToolbar({
  heading,
  tabs,
  activeFn,
  start,
  slotRef,
  children,
  ...props
}: {
  heading?: ReactNode
  tabs?: SubtabDirectory
  activeFn?: (path: string, route: string) => boolean
  start?: ReactNode
  slotRef?: Ref<HTMLDivElement>
  children?: ReactNode
} & ComponentProps<typeof PageToolbarSC>) {
  return (
    <PageToolbarSC {...props}>
      {heading && <ToolbarHeadingSC>{heading}</ToolbarHeadingSC>}
      {tabs && (
        <ToolbarTabs
          directory={tabs}
          activeFn={activeFn}
        />
      )}
      {start}
      {(children || slotRef) && (
        <ToolbarEndSC>
          {slotRef && (
            <div
              ref={slotRef}
              css={{ display: 'contents' }}
            />
          )}
          {children}
        </ToolbarEndSC>
      )}
    </PageToolbarSC>
  )
}

export const PageToolbarSlotContext = createContext<Nullable<HTMLElement>>(null)

export function PageToolbarPortal({ children }: { children: ReactNode }) {
  const slot = useContext(PageToolbarSlotContext)

  return slot ? createPortal(children, slot) : null
}

export function ToolbarTabs({
  directory,
  activeFn,
}: {
  directory: SubtabDirectory
  activeFn?: (path: string, route: string) => boolean
}) {
  const route = useParams()['*'] ?? ''
  const { pathname } = useLocation()

  return (
    <TabsSC>
      <ArrowScroll>
        <TabsRowSC role="tablist">
          {directory
            .filter(({ enabled }) => enabled ?? true)
            .map(({ path, label }) => {
              const active =
                activeFn?.(path, route) ??
                (pathname === path || pathname.startsWith(`${path}/`))

              return (
                <ToolbarTabSC
                  key={path}
                  to={path}
                  role="tab"
                  aria-selected={active}
                  $active={active}
                >
                  <TabLabelSC>
                    <span>{label}</span>
                    <span
                      aria-hidden
                      className="boldSizer"
                    >
                      {label}
                    </span>
                  </TabLabelSC>
                </ToolbarTabSC>
              )
            })}
        </TabsRowSC>
      </ArrowScroll>
    </TabsSC>
  )
}

// A small search input that widens while focused, for a page's main search.
export function ToolbarSearchInput({
  value,
  onChange,
  placeholder = 'Search',
  ...props
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
} & Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'size'>) {
  const [focused, setFocused] = useState(false)

  return (
    <SearchSC $expanded={focused}>
      <Input
        size="small"
        showClearButton
        placeholder={placeholder}
        startIcon={<SearchIcon size={12} />}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
    </SearchSC>
  )
}

export const PageToolbarSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  flexShrink: 0,
  height: PAGE_TOOLBAR_HEIGHT,
  minWidth: 0,
  padding: `0 ${theme.spacing.large}`,
  backgroundColor: theme.colors['fill-accent'],
  borderBottom: theme.borders.hairline,
  position: 'relative',
  zIndex: 1,
}))

// tabs pull left by their own padding, so marginRight alone is the gap between
// the divider and the active tab's background; keep it equal to paddingRight
const ToolbarHeadingSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  flexShrink: 0,
  maxWidth: 280,
  minWidth: 0,
  height: 24,
  paddingRight: theme.spacing.small,
  marginRight: theme.spacing.small,
  borderRight: theme.borders.default,
}))

const ToolbarEndSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: theme.spacing.small,
  flexShrink: 0,
  marginLeft: 'auto',
}))

const TabsSC = styled.div(({ theme }) => ({
  display: 'flex',
  minWidth: 0,
  flexShrink: 1,
  // keeps the first label in line with the page content
  marginLeft: theme.spacing['minus-small'],
}))

const TabsRowSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xxsmall,
}))

const ToolbarTabSC = styled(UnstyledLink)<{ $active: boolean }>(
  ({ theme, $active }) => ({
    ...theme.partials.text.body2,
    fontSize: '0.875rem',
    fontWeight: $active ? 600 : 400,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xxsmall,
    padding: `0.375rem ${theme.spacing.small}`,
    borderRadius: theme.borderRadiuses.medium,
    whiteSpace: 'nowrap',
    color: $active
      ? theme.colors.text
      : theme.mode === 'light'
        ? theme.colors['text-xlight']
        : // dark mode's xlight reads too close to the active text
          `color-mix(in srgb, ${theme.colors['text-xlight']}, ${theme.colors['text-input-disabled']})`,
    backgroundColor: $active
      ? theme.colors['fill-one-selected']
      : 'transparent',
    transition: 'color 150ms ease, background-color 150ms ease',
    ...(!$active && {
      '&:hover': {
        color: theme.colors['text-light'],
        // light mode's hover fill is darker than its selected fill
        backgroundColor:
          theme.colors[
            theme.mode === 'light' ? 'fill-zero-raised' : 'fill-zero-hover'
          ],
      },
    }),
    '&:focus-visible': {
      outline: 'none',
      boxShadow: `inset 0 0 0 1px ${theme.colors['border-outline-focused']}`,
    },
  })
)

// a hidden bold copy of the label reserves its bold width, so tabs don't
// shift when the selection changes
const TabLabelSC = styled.span({
  display: 'inline-grid',
  '& > *': {
    gridArea: '1 / 1',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  '.boldSizer': {
    fontWeight: 600,
    visibility: 'hidden',
  },
})

const SearchSC = styled.div<{ $expanded: boolean }>(({ $expanded }) => ({
  flexShrink: 1,
  minWidth: 120,
  width: $expanded ? SEARCH_EXPANDED_WIDTH : SEARCH_WIDTH,
  transition: 'width 200ms ease',
  '& > *': { width: '100%' },
}))
