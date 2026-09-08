import {
  Card,
  Checkbox,
  Chip,
  DiffColumnIcon,
  DiffUnifiedIcon,
  Flex,
  IconFrame,
  Radio,
  RadioGroup,
  SortAscIcon,
  SortDescIcon,
} from '@pluralsh/design-system'
import {
  IssueSort,
  IssueSortDirection,
  IssueStatus,
  IssueWebhookProvider,
} from 'generated/graphql'
import { includes, startCase } from 'lodash'
import { ReactElement } from 'react'
import styled from 'styled-components'
import {
  ISSUE_STATUS_LABELS,
  ISSUE_STATUS_OPTIONS,
} from 'components/workbenches/common/issueStatus'
import {
  toggleListValue,
  visibleIssueProviders,
  WorkbenchIssuesDisplayState,
} from './workbenchIssuesDisplay'

export function WorkbenchIssuesDisplayPanel({
  state,
  onChange,
  providerCounts,
  statusCounts,
}: {
  state: WorkbenchIssuesDisplayState
  onChange: (next: WorkbenchIssuesDisplayState) => void
  providerCounts: Partial<Record<IssueWebhookProvider, number>>
  statusCounts: Partial<Record<IssueStatus, number>>
}) {
  const providers = visibleIssueProviders(providerCounts)

  return (
    <PanelSC fillLevel={1}>
      <ViewToggleSC>
        <ViewChip
          selected={state.view === 'list'}
          icon={<DiffUnifiedIcon />}
          onClick={() => onChange({ ...state, view: 'list' })}
        >
          List
        </ViewChip>
        <ViewChip
          selected={state.view === 'board'}
          icon={<DiffColumnIcon />}
          onClick={() => onChange({ ...state, view: 'board' })}
        >
          Board
        </ViewChip>
      </ViewToggleSC>
      <SectionSC>
        <SectionHeaderSC>Source from</SectionHeaderSC>
        <FilterRowsSC>
          {providers.map((provider) => (
            <FilterRow
              key={provider}
              label={startCase(provider.toLowerCase())}
              count={providerCounts[provider] ?? 0}
              checked={includes(state.providers, provider)}
              onChange={() =>
                onChange({
                  ...state,
                  providers: toggleListValue(state.providers, provider),
                })
              }
            />
          ))}
        </FilterRowsSC>
      </SectionSC>
      <SectionSC>
        <SectionHeaderSC>Ticket status</SectionHeaderSC>
        <FilterRowsSC $compact>
          {ISSUE_STATUS_OPTIONS.map((status) => (
            <FilterRow
              key={status}
              label={ISSUE_STATUS_LABELS[status]}
              count={statusCounts[status] ?? 0}
              checked={includes(state.statuses, status)}
              onChange={() =>
                onChange({
                  ...state,
                  statuses: toggleListValue(state.statuses, status),
                })
              }
            />
          ))}
        </FilterRowsSC>
      </SectionSC>
      <SectionSC>
        <SortHeaderSC>
          <SectionTitleSC>Sort by</SectionTitleSC>
          <IconFrame
            clickable
            textValue={`Sort ${state.direction === IssueSortDirection.Desc ? 'descending' : 'ascending'}`}
            size="small"
            type="tertiary"
            tooltip={
              state.direction === IssueSortDirection.Desc
                ? 'Descending'
                : 'Ascending'
            }
            icon={
              state.direction === IssueSortDirection.Desc ? (
                <SortDescIcon />
              ) : (
                <SortAscIcon />
              )
            }
            onClick={() =>
              onChange({
                ...state,
                direction:
                  state.direction === IssueSortDirection.Desc
                    ? IssueSortDirection.Asc
                    : IssueSortDirection.Desc,
              })
            }
            css={{
              width: 28,
              height: 20,
              borderRadius: 6,
              '& svg': { width: 12, height: 12 },
            }}
          />
        </SortHeaderSC>
        <RadioGroupSC
          value={state.sort}
          onChange={(value) => onChange({ ...state, sort: value as IssueSort })}
        >
          <Radio
            small
            value={IssueSort.InsertedAt}
          >
            Date created
          </Radio>
          <Radio
            small
            value={IssueSort.Title}
          >
            Issue name
          </Radio>
        </RadioGroupSC>
      </SectionSC>
    </PanelSC>
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
      icon={icon}
      fillLevel={selected ? 3 : 1}
      aria-pressed={selected}
      onClick={onClick}
      css={{
        width: '100%',
        justifyContent: 'center',
        '&&': {
          minWidth: 80,
          padding: '5px 12px',
        },
        '& .icon svg': { width: 12, height: 12 },
      }}
    >
      {children}
    </Chip>
  )
}

function FilterRow({
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
