import { AgentLoadingIcon } from '@pluralsh/design-system'
import { ReactNode } from 'react'
import styled from 'styled-components'

// Shared building blocks for the workbench Details views (jobs, issues,
// alerts): a selectable list on the left and detail panels on the right.

const DETAILS_LIST_WIDTH = 350
const STATUS_GUTTER_SIZE = 10

export type DetailsGutterStatus = 'running' | 'failed' | null

export function DetailsListItem({
  selected,
  onSelect,
  gutter,
  title,
  subtitle,
  end,
}: {
  selected: boolean
  onSelect: () => void
  gutter?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  end?: ReactNode
}) {
  return (
    <ListItemSC
      type="button"
      aria-pressed={selected}
      $selected={selected}
      onClick={onSelect}
    >
      <GutterSC>{gutter}</GutterSC>
      <ListItemTextSC>
        <ListItemTitleSC>{title}</ListItemTitleSC>
        {subtitle && <ListItemSubtitleSC>{subtitle}</ListItemSubtitleSC>}
      </ListItemTextSC>
      {end && <ListItemEndSC>{end}</ListItemEndSC>}
    </ListItemSC>
  )
}

// Only running and failed items get a marker. The gutter keeps its width
// otherwise, so titles stay aligned when every item succeeded.
export function DetailsStatusGutter({
  status,
}: {
  status: DetailsGutterStatus
}) {
  if (status === 'running')
    return (
      <AgentLoadingIcon
        size={STATUS_GUTTER_SIZE}
        variant="cursorEq"
      />
    )
  if (status === 'failed') return <FailedDotSC aria-label="Failed" />
  return null
}

export function DetailsPanelHeader({
  title,
  children,
}: {
  title: string
  children?: ReactNode
}) {
  return (
    <PanelHeaderSC>
      <PanelHeaderTitleSC>{title}</PanelHeaderTitleSC>
      {children && <PanelHeaderActionsSC>{children}</PanelHeaderActionsSC>}
    </PanelHeaderSC>
  )
}

export function DetailsErrorBanner({
  children,
  action,
}: {
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <ErrorBannerSC role="alert">
      <ErrorBannerTextSC>
        <FailedDotSC $size={10} />
        <span>{children}</span>
      </ErrorBannerTextSC>
      {action}
    </ErrorBannerSC>
  )
}

export const DetailsLayoutSC = styled.div<{ $panelCount: number }>(
  ({ theme, $panelCount }) => ({
    display: 'grid',
    gridTemplateColumns: `${DETAILS_LIST_WIDTH}px repeat(${$panelCount}, minmax(0, 1fr))`,
    flex: 1,
    minHeight: 0,
    borderTop: theme.borders.default,
  })
)

export const DetailsListSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  minHeight: 0,
  overflowY: 'auto',
  overflowX: 'hidden',
  borderRight: theme.borders.default,
}))

export const DetailsColumnSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  minHeight: 0,
  borderRight: theme.borders.default,
  '&:last-child': { borderRight: 'none' },
}))

export const DetailsPanelBodySC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  padding: theme.spacing.medium,
  backgroundColor:
    theme.mode === 'light'
      ? theme.colors['fill-zero']
      : theme.colors['fill-accent'],
}))

export const DetailsLinkSC = styled.span(({ theme }) => ({
  color: theme.colors['text-primary-accent'],
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  textDecoration: 'none',
  '&:hover': { textDecoration: 'underline' },
}))

const ListItemSC = styled.button<{ $selected: boolean }>(
  ({ theme, $selected }) => ({
    all: 'unset',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.medium,
    width: '100%',
    padding: `${theme.spacing.small}px ${theme.spacing.large}px ${theme.spacing.small}px ${theme.spacing.medium}px`,
    cursor: 'pointer',
    backgroundColor: $selected ? theme.colors['fill-one-selected'] : undefined,
    '&:hover': {
      backgroundColor: $selected
        ? theme.colors['fill-one-selected']
        : theme.colors['fill-zero-hover'],
    },
    '&:focus-visible': {
      outline: theme.borders['outline-focused'],
      outlineOffset: -1,
    },
  })
)

const GutterSC = styled.div({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: STATUS_GUTTER_SIZE,
})

const ListItemTextSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxxsmall,
  flex: 1,
  minWidth: 0,
}))

const ListItemTitleSC = styled.div(({ theme }) => ({
  ...theme.partials.text.body2LooseLineHeight,
  color: theme.colors['text-light'],
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}))

const ListItemSubtitleSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}))

const ListItemEndSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  flexShrink: 0,
  color: theme.colors['text-xlight'],
}))

const PanelHeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing.small,
  flexShrink: 0,
  minHeight: 44,
  padding: `0 ${theme.spacing.medium}px`,
  borderBottom: theme.borders.default,
  backgroundColor: theme.colors['fill-one'],
}))

const PanelHeaderTitleSC = styled.span(({ theme }) => ({
  ...theme.partials.text.overline,
  color: theme.colors['text-xlight'],
}))

const PanelHeaderActionsSC = styled.div(({ theme }) => ({
  ...theme.partials.text.body2,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  color: theme.colors['text-xlight'],
}))

const FailedDotSC = styled.span<{ $size?: number }>(({ theme, $size = 6 }) => ({
  display: 'inline-block',
  flexShrink: 0,
  width: $size,
  height: $size,
  borderRadius: '50%',
  backgroundColor: theme.colors['icon-danger'],
}))

const ErrorBannerSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  padding: theme.spacing.xsmall,
  borderRadius: theme.borderRadiuses.medium,
  border: `0.75px solid ${theme.mode === 'light' ? theme.colors.red[200] : theme.colors.red[800]}`,
  backgroundColor:
    theme.mode === 'light' ? theme.colors.red[50] : theme.colors.red[900],
  color: theme.colors.text,
  flexShrink: 0,
}))

const ErrorBannerTextSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  flex: 1,
  minWidth: 0,
}))
