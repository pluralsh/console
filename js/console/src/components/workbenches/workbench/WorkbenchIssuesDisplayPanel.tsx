import {
  Card,
  Checkbox,
  Chip,
  Flex,
  IconFrame,
  ListIcon,
  Radio,
  RadioGroup,
  SortAscIcon,
  SortDescIcon,
  TableIcon,
} from '@pluralsh/design-system'
import {
  IssueSort,
  IssueSortDirection,
  IssueStatus,
  IssueWebhookProvider,
} from 'generated/graphql'
import { startCase } from 'lodash'
import { ReactElement } from 'react'
import styled from 'styled-components'
import {
  ISSUE_STATUS_OPTIONS,
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
          icon={<ListIcon />}
          onClick={() => onChange({ ...state, view: 'list' })}
        >
          List
        </ViewChip>
        <ViewChip
          selected={state.view === 'board'}
          icon={<TableIcon />}
          onClick={() => onChange({ ...state, view: 'board' })}
        >
          Board
        </ViewChip>
      </ViewToggleSC>
      <SectionSC>
        <SectionHeaderSC>Source from</SectionHeaderSC>
        {providers.map((provider) => (
          <FilterRow
            key={provider}
            label={startCase(provider.toLowerCase())}
            count={providerCounts[provider] ?? 0}
            checked={state.providers.includes(provider)}
            onChange={() =>
              onChange({
                ...state,
                providers: toggleListValue(state.providers, provider),
              })
            }
          />
        ))}
      </SectionSC>
      <SectionSC $divided>
        <SectionHeaderSC>Ticket status</SectionHeaderSC>
        {ISSUE_STATUS_OPTIONS.map((status) => (
          <FilterRow
            key={status}
            label={startCase(status.toLowerCase())}
            count={statusCounts[status] ?? 0}
            checked={state.statuses.includes(status)}
            onChange={() =>
              onChange({
                ...state,
                statuses: toggleListValue(state.statuses, status),
              })
            }
          />
        ))}
      </SectionSC>
      <SectionSC $divided>
        <SortHeaderSC>
          <SectionTitleSC>Sort by</SectionTitleSC>
          <IconFrame
            clickable
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
      inactive={!selected}
      onClick={onClick}
      css={{
        width: '100%',
        justifyContent: 'center',
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
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  overflowY: 'auto',
  padding: `0 ${theme.spacing.medium}px ${theme.spacing.medium}px`,
  width: 230,
}))

const ViewToggleSC = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: theme.spacing.xsmall,
  paddingTop: theme.spacing.medium,
}))

const SectionSC = styled.div<{ $divided?: boolean }>(({ theme, $divided }) => ({
  display: 'flex',
  flexDirection: 'column',
  ...($divided
    ? {
        borderTop: theme.borders.default,
        marginTop: theme.spacing.small,
        paddingTop: theme.spacing.small,
      }
    : {}),
}))

const SectionHeaderSC = styled.div(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors.text,
  paddingTop: theme.spacing.medium,
  paddingBottom: theme.spacing.xsmall,
}))

const SectionTitleSC = styled.span(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors.text,
}))

const SortHeaderSC = styled(Flex)(({ theme }) => ({
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingTop: theme.spacing.medium,
  paddingBottom: theme.spacing.xsmall,
}))

const FilterRowSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing.xsmall,
  minHeight: 36,
  '& label': {
    flex: 1,
    minWidth: 0,
  },
}))

const CountSC = styled.span(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-xlight'],
  flexShrink: 0,
}))

const RadioGroupSC = styled(RadioGroup)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
}))
