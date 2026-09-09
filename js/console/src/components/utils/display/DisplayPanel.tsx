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
  RadioGroup,
  SortAscIcon,
  SortDescIcon,
} from '@pluralsh/design-system'
import { Body1BoldP, Body2P } from 'components/utils/typography/Text'
import { ComponentProps, ReactElement, ReactNode } from 'react'
import styled from 'styled-components'

export type DisplayView = 'list' | 'board'

export function DisplayButton({
  showDot,
  onClick,
}: {
  showDot: boolean
  onClick: () => void
}) {
  return (
    <Button
      secondary
      startIcon={<FiltersIcon />}
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

export function DisplayViewToggle({
  view,
  onChange,
}: {
  view: DisplayView
  onChange: (view: DisplayView) => void
}) {
  return (
    <ViewToggleSC>
      <ViewChip
        selected={view === 'list'}
        icon={<DiffUnifiedIcon />}
        onClick={() => onChange('list')}
      >
        List
      </ViewChip>
      <ViewChip
        selected={view === 'board'}
        icon={<DiffColumnIcon />}
        onClick={() => onChange('board')}
      >
        Board
      </ViewChip>
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
        onChange={() => onChange()}
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
          borderRadius: 999,
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

const ViewToggleSC = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: theme.spacing.xxsmall,
  padding: `${theme.spacing.medium}px 0`,
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
