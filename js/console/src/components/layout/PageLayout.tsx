import { createContext, ReactNode, useContext } from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'
import { PAGE_TOOLBAR_HEIGHT } from './PageToolbar'

export const PAGE_SIDEBAR_WIDTH = 240
export const PAGE_SIDECAR_WIDTH = 280

// A page whose sidebar runs from the header down, beside its toolbar and
// content rather than under the toolbar.
export function PageWithSidebar({
  sidebar,
  toolbar,
  children,
}: {
  sidebar: ReactNode
  toolbar?: ReactNode
  children: ReactNode
}) {
  return (
    <PageRowSC>
      {sidebar}
      <PageColumnSC>
        {toolbar}
        {children}
      </PageColumnSC>
    </PageRowSC>
  )
}

// Content with an optional panel docked to the right edge of the viewport,
// e.g. the display options of a list page.
export function PageWithSidecar({
  sidecar,
  children,
}: {
  sidecar?: ReactNode
  children: ReactNode
}) {
  return (
    <PageRowSC>
      <PageColumnSC>{children}</PageColumnSC>
      {sidecar && <PageSidecarSC>{sidecar}</PageSidecarSC>}
    </PageRowSC>
  )
}

export const PageSidecarSlotContext = createContext<Nullable<HTMLElement>>(null)

// renders into the nearest sidecar slot, e.g. a tab's display options docked
// beside its parent's content
export function PageSidecarPortal({ children }: { children: ReactNode }) {
  const slot = useContext(PageSidecarSlotContext)

  return slot ? createPortal(children, slot) : null
}

export const PageRowSC = styled.div({
  display: 'flex',
  alignItems: 'stretch',
  flex: 1,
  height: '100%',
  width: '100%',
  minHeight: 0,
  minWidth: 0,
  overflow: 'hidden',
})

// height covers block parents (e.g. route wrappers), where flex has no effect
export const PageColumnSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  height: '100%',
  minHeight: 0,
  minWidth: 0,
})

export const PageSidebarSC = styled.div<{ $width?: number }>(
  ({ theme, $width = PAGE_SIDEBAR_WIDTH }) => ({
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    alignSelf: 'stretch',
    width: $width,
    minHeight: 0,
    overflow: 'hidden',
    backgroundColor: theme.colors['fill-accent'],
    borderRight: theme.borders.hairline,
  })
)

// the sidebar's top row, level with the page toolbar beside it
export const PageSidebarHeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  flexShrink: 0,
  height: PAGE_TOOLBAR_HEIGHT,
  padding: `0 ${theme.spacing.medium}px`,
  borderBottom: theme.borders.hairline,
  '& > *': { flex: 1, minWidth: 0 },
}))

export const PageSidebarBodySC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  padding: theme.spacing.medium,
}))

export const PageSidecarSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  alignSelf: 'stretch',
  width: PAGE_SIDECAR_WIDTH,
  minHeight: 0,
  overflowY: 'auto',
  backgroundColor: theme.colors['fill-accent'],
  borderLeft: theme.borders.hairline,
}))

// a sidecar for `PageSidecarPortal`, hidden while nothing renders into it
export const PageSidecarSlotSC = styled(PageSidecarSC)({
  '&:empty': { display: 'none' },
})

// padded, scrolling page content under a toolbar
export const PageContentSC = styled.div<{ $maxWidth?: number }>(
  ({ theme, $maxWidth }) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.medium,
    flex: 1,
    minHeight: 0,
    width: '100%',
    overflow: 'auto',
    padding: theme.spacing.large,
    ...($maxWidth && {
      '& > *': {
        width: '100%',
        maxWidth: $maxWidth,
        marginLeft: 'auto',
        marginRight: 'auto',
      },
    }),
  })
)
