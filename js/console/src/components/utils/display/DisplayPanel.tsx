import {
  FloatingFocusManager,
  FloatingPortal,
  useDismiss,
  useInteractions,
} from '@floating-ui/react'
import {
  Button,
  Card,
  Checkbox,
  Chip,
  DiffColumnIcon,
  DiffUnifiedIcon,
  FiltersIcon,
  Flex,
  IconFrame,
  OpenPanelFilledLeftIcon,
  RadioGroup,
  SortAscIcon,
  SortDescIcon,
  useFloatingDropdown,
} from '@pluralsh/design-system'
import usePersistedState from 'components/hooks/usePersistedState'
import { Body1BoldP, Body2P } from 'components/utils/typography/Text'
import { xor } from 'lodash'
import {
  ComponentProps,
  ReactElement,
  ReactNode,
  useRef,
  useState,
} from 'react'
import styled, { useTheme } from 'styled-components'

export type DisplayView = 'list' | 'board' | 'details'

const DISPLAY_POPOVER_WIDTH = 301

const DISPLAY_VIEW_OPTIONS: Record<
  DisplayView,
  { label: string; icon: ReactElement }
> = {
  list: { label: 'List', icon: <DiffUnifiedIcon /> },
  board: { label: 'Board', icon: <DiffColumnIcon /> },
  details: { label: 'Details', icon: <OpenPanelFilledLeftIcon /> },
}

// View choice remembered per user (localStorage), restricted to `views`.
export function usePersistedDisplayView(
  storageKey: string,
  views: DisplayView[],
  defaultView: DisplayView
) {
  return usePersistedState<DisplayView>(
    storageKey,
    defaultView,
    0,
    (value: unknown) =>
      views.includes(value as DisplayView)
        ? (value as DisplayView)
        : defaultView
  )
}

export function toggleListValue<T>(list: T[], value: T): T[] {
  return xor(list, [value])
}

export function DisplayButton({
  showDot,
  expanded,
  onClick,
}: {
  showDot: boolean
  expanded?: boolean
  onClick: () => void
}) {
  return (
    <Button
      secondary
      startIcon={<FiltersIcon />}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      onClick={onClick}
    >
      <DisplayLabelSC>
        Display
        {showDot && <DisplayFilterDotSC />}
      </DisplayLabelSC>
    </Button>
  )
}

export function DisplayPanel({ children }: { children: ReactNode }) {
  return <PanelSC fillLevel={1}>{children}</PanelSC>
}

// Display button with its panel floating over the content below it.
export function DisplayPopover({
  showDot,
  children,
}: {
  showDot: boolean
  children: ReactNode
}) {
  const theme = useTheme()
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const { floating, triggerRef } = useFloatingDropdown({
    triggerRef: ref,
    placement: 'bottom-end',
    width: DISPLAY_POPOVER_WIDTH,
    minWidth: DISPLAY_POPOVER_WIDTH,
    // no minimum: the panel is as tall as its options
    minHeight: 0,
    maxHeight: '80vh',
    sizeToContent: true,
    open,
    onOpenChange: setOpen,
  })
  // dismisses on outside press and on Escape wherever focus is (e.g. after
  // clicking plain text in the panel); focus then returns to the button
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useDismiss(floating.context),
  ])

  return (
    <div
      ref={triggerRef}
      {...getReferenceProps()}
    >
      <DisplayButton
        showDot={showDot}
        expanded={open}
        onClick={() => setOpen(!open)}
      />
      {open && (
        <FloatingPortal id={theme.portals.default.id}>
          <FloatingFocusManager
            context={floating.context}
            modal={false}
          >
            <PopoverPanelSC
              ref={floating.refs.setFloating}
              role="dialog"
              aria-label="Display options"
              fillLevel={1}
              style={{
                position: floating.strategy,
                left: floating.x ?? 0,
                top: floating.y ?? 0,
              }}
              {...getFloatingProps()}
            >
              {children}
            </PopoverPanelSC>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </div>
  )
}

export function DisplayViewToggle({
  view,
  views = ['list', 'board'],
  onChange,
}: {
  view: DisplayView
  views?: DisplayView[]
  onChange: (view: DisplayView) => void
}) {
  return (
    <ViewToggleSC $count={views.length}>
      {views.map((option) => (
        <ViewChip
          key={option}
          selected={view === option}
          icon={DISPLAY_VIEW_OPTIONS[option].icon}
          onClick={() => onChange(option)}
        >
          {DISPLAY_VIEW_OPTIONS[option].label}
        </ViewChip>
      ))}
    </ViewToggleSC>
  )
}

export function DisplaySection({ children }: { children: ReactNode }) {
  return <SectionSC>{children}</SectionSC>
}

export function DisplaySectionHeader({ children }: { children: ReactNode }) {
  return <SectionHeaderSC>{children}</SectionHeaderSC>
}

export function DisplayFilterRows({
  compact,
  children,
}: {
  compact?: boolean
  children: ReactNode
}) {
  return <FilterRowsSC $compact={compact}>{children}</FilterRowsSC>
}

export function DisplayFilterRow({
  label,
  count,
  checked,
  onChange,
}: {
  label: string
  count: number
  checked: boolean
  onChange: () => void
}) {
  return (
    <FilterRowSC>
      <Checkbox
        small
        checked={checked}
        onChange={onChange}
      >
        {label}
      </Checkbox>
      <CountSC>{count}</CountSC>
    </FilterRowSC>
  )
}

export function DisplaySortHeader({
  descending,
  onToggle,
}: {
  descending: boolean
  onToggle: () => void
}) {
  return (
    <SortHeaderSC>
      <SectionTitleSC>Sort by</SectionTitleSC>
      <IconFrame
        clickable
        textValue={`Sort ${descending ? 'descending' : 'ascending'}`}
        size="small"
        type="tertiary"
        tooltip={descending ? 'Descending' : 'Ascending'}
        icon={descending ? <SortDescIcon /> : <SortAscIcon />}
        onClick={onToggle}
        css={{
          width: 28,
          height: 20,
          borderRadius: 6,
          '& svg': { width: 12, height: 12 },
        }}
      />
    </SortHeaderSC>
  )
}

export function DisplayRadioGroup(props: ComponentProps<typeof RadioGroup>) {
  return <RadioGroupSC {...props} />
}

export function DisplayFilterEmpty({
  title,
  description,
  onReset,
}: {
  title: string
  description: string
  onReset: () => void
}) {
  return (
    <EmptyWrapperSC fillLevel={1}>
      <EmptyCopySC>
        <Body1BoldP css={{ margin: 0 }}>{title}</Body1BoldP>
        <Body2P
          $color="text-light"
          css={{ margin: 0 }}
        >
          {description}
        </Body2P>
      </EmptyCopySC>
      <Button
        small
        onClick={onReset}
      >
        Reset filters
      </Button>
    </EmptyWrapperSC>
  )
}

function ViewChip({
  selected,
  icon,
  onClick,
  children,
}: {
  selected: boolean
  icon: ReactElement
  onClick: () => void
  children: string
}) {
  return (
    <Chip
      clickable
      rounded
      icon={icon}
      fillLevel={selected ? 3 : 1}
      aria-pressed={selected}
      onClick={onClick}
      css={{
        width: '100%',
        justifyContent: 'center',
        '&&': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 32,
          minWidth: 80,
          padding: '5px 12px',
          boxShadow: 'none',
        },
        '& .icon svg': { width: 12, height: 12 },
      }}
    >
      {children}
    </Chip>
  )
}

export const DisplayToolbarSC = styled(Flex)(({ theme }) => ({
  alignItems: 'center',
  gap: theme.spacing.medium,
}))

export const DisplayContentSC = styled(Flex)(({ theme }) => ({
  flex: 1,
  gap: theme.spacing.medium,
  minHeight: 0,
}))

export const DisplayMainSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  minWidth: 0,
})

const DisplayLabelSC = styled.span(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
}))

const DisplayFilterDotSC = styled.span(({ theme }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: theme.colors['text-primary-accent'],
  flexShrink: 0,
}))

const PanelSC = styled(Card)(({ theme }) => ({
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  alignSelf: 'stretch',
  height: '100%',
  maxHeight: '100%',
  minHeight: 0,
  overflowY: 'auto',
  padding: `0 ${theme.spacing.medium}px`,
  width: 230,
}))

const PopoverPanelSC = styled(Card)(({ theme }) => ({
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
  padding: `0 ${theme.spacing.medium}px`,
  boxShadow: theme.boxShadows.moderate,
  zIndex: theme.zIndexes.selectPopover,
  '& > :last-child': { borderBottom: 'none' },
}))

const ViewToggleSC = styled.div<{ $count: number }>(({ theme, $count }) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${$count}, 1fr)`,
  gap: theme.spacing.xxsmall,
  padding: `${theme.spacing.medium}px 0 ${theme.spacing.xsmall}px`,
  // the switch alone in the panel gets even top/bottom padding; otherwise
  // the next section header adds its own top padding
  '&:last-child': { paddingBottom: theme.spacing.medium },
}))

const SectionSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  borderBottom: theme.borders.default,
}))

const SectionHeaderSC = styled.div(({ theme }) => ({
  ...theme.partials.text.body2Bold,
  color: theme.colors.text,
  paddingTop: theme.spacing.medium,
  paddingBottom: theme.spacing.xxsmall,
}))

const SectionTitleSC = styled.span(({ theme }) => ({
  ...theme.partials.text.body2Bold,
  color: theme.colors.text,
}))

const SortHeaderSC = styled(Flex)(({ theme }) => ({
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingTop: theme.spacing.medium,
  paddingBottom: theme.spacing.xxsmall,
}))

const FilterRowsSC = styled.div<{ $compact?: boolean }>(
  ({ theme, $compact }) => ({
    display: 'flex',
    flexDirection: 'column',
    paddingTop: theme.spacing.xxsmall,
    paddingBottom: $compact ? theme.spacing.xxsmall : theme.spacing.medium,
  })
)

const FilterRowSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing.xxsmall,
  '& label': {
    flex: 1,
    minWidth: 0,
  },
}))

const CountSC = styled.span(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-input-disabled'],
  flexShrink: 0,
}))

const RadioGroupSC = styled(RadioGroup)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  paddingTop: theme.spacing.xxsmall,
  paddingBottom: theme.spacing.medium,
}))

const EmptyWrapperSC = styled(Card)(({ theme }) => ({
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing.small,
  height: 540,
  maxHeight: '100%',
  width: '100%',
  minHeight: 160,
  padding: `${theme.spacing.xlarge}px ${theme.spacing.medium}px`,
}))

const EmptyCopySC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing.xxsmall,
}))
