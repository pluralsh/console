import {
  AgentLoadingIcon,
  Flex,
  HamburgerMenuCollapsedIcon,
  HamburgerMenuCollapseIcon,
  IconFrame,
  Tab,
  TabList,
} from '@pluralsh/design-system'
import { TRUNCATE } from 'components/utils/truncate'
import { isJobRunning } from 'components/workbenches/workbench/job/WorkbenchJobActivity'
import { WorkbenchJobStatus } from 'generated/graphql'
import { ReactNode, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { BoardTitleSC } from './WorkbenchBoard'

// Shared building blocks for the workbench Details views (jobs, issues,
// alerts): a selectable list on the left and detail panels on the right.

const DETAILS_LIST_WIDTH = 350
const STATUS_GUTTER_SIZE = 10
const DETAILS_PANEL_HEADER_HEIGHT = 44
// tab strip height when the list is the sidebar: its search row (2x16 padding
// + 32 input) sits above the same border as the details panels
export const DETAILS_TAB_STRIP_HEIGHT = 64

export type DetailsGutterStatus = 'running' | 'failed' | null

// Selected list item, falling back to the first item while none is selected
// or the selected one has left the list. Also tracks whether the right-most
// details panel is open.
export function useDetailsSelection<T extends { id: string }>(items: T[]) {
  const [selectedId, setSelectedId] = useState<string>()
  const [detailsOpen, setDetailsOpen] = useState(true)

  return {
    selected: items.find(({ id }) => id === selectedId) ?? items[0],
    setSelectedId,
    detailsOpen,
    setDetailsOpen,
  }
}

// Gutter marker for an item's workbench job.
export function getJobGutterStatus(
  status: Nullable<WorkbenchJobStatus>
): DetailsGutterStatus {
  if (status === WorkbenchJobStatus.Failed) return 'failed'
  if (isJobRunning(status)) return 'running'
  return null
}

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
        size={STATUS_GUTTER_SIZE - 1}
        variant="cursorEq"
      />
    )
  if (status === 'failed')
    return (
      <FailedDotSC
        role="img"
        aria-label="Failed"
      />
    )
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

// Hides the right-most details panel.
export function DetailsCollapseButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <IconFrame
      clickable
      type="tertiary"
      size="large"
      textValue={label}
      tooltip={label}
      icon={<HamburgerMenuCollapsedIcon />}
      onClick={onClick}
    />
  )
}

// Brings a collapsed details panel back.
export function DetailsExpandButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <IconFrame
      clickable
      type="tertiary"
      size="large"
      textValue={label}
      tooltip={label}
      icon={<HamburgerMenuCollapseIcon />}
      onClick={onClick}
    />
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
        <FailedDotSC
          $size={10}
          aria-hidden
        />
        <span>{children}</span>
      </ErrorBannerTextSC>
      {action}
    </ErrorBannerSC>
  )
}

// Underline tabs under a details panel header.
export function DetailsTabs<T extends string>({
  tabs,
  selected,
  onChange,
}: {
  tabs: T[]
  selected: T
  onChange: (tab: T) => void
}) {
  const theme = useTheme()
  const tabStateRef = useRef<any>(null)

  return (
    <Flex
      flexShrink={0}
      css={{ backgroundColor: theme.colors['fill-one'] }}
    >
      <TabList
        scrollable
        stateRef={tabStateRef}
        stateProps={{
          orientation: 'horizontal',
          selectedKey: selected,
          onSelectionChange: (key) => onChange(String(key) as T),
        }}
        flexShrink={0}
      >
        {tabs.map((label) => (
          <Tab
            key={label}
            textValue={label}
          >
            {label}
          </Tab>
        ))}
      </TabList>
      <Flex
        flex={1}
        css={{ borderBottom: theme.borders.default }}
      />
    </Flex>
  )
}

// Caption label over a value, for the summary fields in details panels, the
// issue card and the alert quick view.
export function DetailsField({
  label,
  valueSize = 'body2',
  children,
}: {
  label: string
  valueSize?: 'body2' | 'caption'
  children: ReactNode
}) {
  return (
    <FieldSC>
      <FieldLabelSC>{label}</FieldLabelSC>
      <FieldValueSC $size={valueSize}>{children}</FieldValueSC>
    </FieldSC>
  )
}

// Clickable row linking out (pull requests, issues).
export const DetailsLinkRowSC = styled.a(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  padding: 10,
  borderRadius: theme.borderRadiuses.medium,
  textDecoration: 'none',
  '&:hover': { backgroundColor: theme.colors['fill-zero-hover'] },
  '&:focus-visible': { outline: theme.borders['outline-focused'] },
}))

// Muted single-line caption, e.g. "updated 3 hours ago" or a card's age.
export const DetailsCaptionSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  whiteSpace: 'nowrap',
}))

// Fixed-width, right-aligned age (e.g. "40d 22h") so the icons before it
// line up across rows.
export const DetailsListAgeSC = styled.span({
  minWidth: 52,
  textAlign: 'right',
  whiteSpace: 'nowrap',
})

// Details panels next to the list, which is rendered as the page sidebar.
export const DetailsLayoutSC = styled.div<{ $panelCount: number }>(
  ({ theme, $panelCount }) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${$panelCount}, minmax(0, 1fr))`,
    flex: 1,
    minHeight: 0,
    borderTop: theme.borders.default,
  })
)

// Full-height list column, rendered as the workbench page sidebar, so its
// search row lines up with the tab strip.
export const DetailsListSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  alignSelf: 'stretch',
  width: DETAILS_LIST_WIDTH,
  height: '100%',
  minHeight: 0,
  borderRight: theme.borders.default,
}))

export const DetailsListSearchSC = styled.div(({ theme }) => ({
  flexShrink: 0,
  padding: theme.spacing.medium,
  borderBottom: theme.borders.default,
}))

export const DetailsListItemsSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  overflowX: 'hidden',
}))

export const DetailsColumnSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  minHeight: 0,
  borderRight: theme.borders.default,
  '&:last-child': { borderRight: 'none' },
}))

export const DetailsTabBodySC = styled.div(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  padding: theme.spacing.medium,
}))

// Leading icon (fixed size) followed by truncated text, for list titles.
export const DetailsIconTitleSC = styled.span(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  minWidth: 0,
  '& > :first-child': { flexShrink: 0 },
  '& > :last-child': TRUNCATE,
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

// Mono title at the top of a details panel body.
export const DetailsTitleSC = styled(BoardTitleSC)(({ theme }) => ({
  ...TRUNCATE,
  paddingTop: theme.spacing.small,
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
  justifyContent: 'center',
  gap: theme.spacing.xxsmall,
  flex: 1,
  minWidth: 0,
  // title + subtitle height, so single-line rows keep the same height
  minHeight: 42,
}))

const ListItemTitleSC = styled.div(({ theme }) => ({
  ...theme.partials.text.body2LooseLineHeight,
  ...TRUNCATE,
  color: theme.colors['text-light'],
}))

const ListItemSubtitleSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  ...TRUNCATE,
  color: theme.colors['text-xlight'],
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
  minHeight: DETAILS_PANEL_HEADER_HEIGHT,
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

const FieldSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: theme.spacing.xxsmall,
  minWidth: 0,
}))

const FieldLabelSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  whiteSpace: 'nowrap',
}))

const FieldValueSC = styled.div<{ $size: 'body2' | 'caption' }>(
  ({ theme, $size }) => ({
    ...theme.partials.text[$size],
    display: 'flex',
    alignItems: 'center',
    minWidth: 0,
    color: theme.colors.text,
    wordBreak: 'break-word',
  })
)

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
