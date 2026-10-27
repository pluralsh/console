import { ListBoxItem, Select } from '@pluralsh/design-system'
import {
  FilterFooter,
  FilterTrigger,
} from 'components/cd/services/service/component/Components'
import {
  ALL_DISPLAY_VIEWS,
  DisplayFilterSection,
  DisplaySection,
  DisplaySectionHeader,
  DisplaySortField,
  DisplaySortHeader,
  DisplayViewToggle,
} from 'components/utils/display/DisplayPanel'
import { WorkbenchJobPrState, WorkbenchJobStatus } from 'generated/graphql'
import { startCase } from 'lodash'
import styled from 'styled-components'
import {
  JOB_PR_STATE_LABELS,
  JOB_PR_STATE_OPTIONS,
  JOB_STATUS_OPTIONS,
  WorkbenchJobPerson,
  WorkbenchJobsDisplayState,
} from './workbenchJobsDisplay'

export function WorkbenchJobsDisplayOptions({
  state,
  onChange,
  statusCounts,
  prStateCounts,
  users,
  searching = false,
}: {
  state: WorkbenchJobsDisplayState
  onChange: (next: WorkbenchJobsDisplayState) => void
  // search results come back by relevance, ignoring the sort
  searching?: boolean
  statusCounts: Partial<Record<WorkbenchJobStatus, number>>
  prStateCounts: Partial<Record<WorkbenchJobPrState, number>>
  users: readonly WorkbenchJobPerson[]
}) {
  return (
    <>
      <DisplayViewToggle
        view={state.view}
        views={ALL_DISPLAY_VIEWS}
        onChange={(view) => onChange({ ...state, view })}
      />
      <DisplayFilterSection
        title="Status"
        options={JOB_STATUS_OPTIONS}
        selected={state.statuses}
        counts={statusCounts}
        getLabel={(status) => startCase(status.toLowerCase())}
        compact
        onChange={(statuses) => onChange({ ...state, statuses })}
      />
      <DisplayFilterSection
        title="Pull request"
        options={JOB_PR_STATE_OPTIONS}
        selected={state.prStates}
        counts={prStateCounts}
        getLabel={(prState) => JOB_PR_STATE_LABELS[prState]}
        compact
        onChange={(prStates) => onChange({ ...state, prStates })}
      />
      <DisplaySection>
        <DisplaySectionHeader>Person</DisplaySectionHeader>
        <PersonSelectSC>
          <PersonMultiSelect
            users={users}
            userIds={state.userIds}
            onChange={(userIds) => onChange({ ...state, userIds })}
          />
        </PersonSelectSC>
      </DisplaySection>
      <DisplaySection>
        <DisplaySortHeader
          disabledReason={
            searching ? 'Search results are sorted by relevance' : undefined
          }
          direction={state.direction}
          onChange={(direction) => onChange({ ...state, direction })}
        />
        {/* jobs only sort by creation date */}
        <DisplaySortField>Date created</DisplaySortField>
      </DisplaySection>
    </>
  )
}

// Checkbox menu of people on jobs already loaded. Select all copies those
// ids; someone who loads later stays unchecked until chosen.
function PersonMultiSelect({
  users,
  userIds,
  onChange,
}: {
  users: readonly WorkbenchJobPerson[]
  userIds: string[]
  onChange: (userIds: string[]) => void
}) {
  const selected = new Set(userIds)
  const allSelected =
    users.length > 0 && users.every((user) => selected.has(user.id))
  const names = new Map(users.map((user) => [user.id, user.name || '—']))
  const label =
    userIds.length === 0
      ? 'Select people'
      : allSelected
        ? 'All people'
        : [...userIds]
            .map((id) => names.get(id) ?? '—')
            .sort((a, b) => a.localeCompare(b))
            .join(', ')

  return (
    <Select
      label="People"
      placement="left"
      maxHeight={240}
      selectionMode="multiple"
      selectedKeys={userIds}
      onSelectionChange={(keys) => {
        onChange(Array.from(keys) as string[])
      }}
      triggerButton={
        <FilterTrigger
          $width="100%"
          $border
          size="small"
          title={label}
        >
          {label}
        </FilterTrigger>
      }
      dropdownFooterFixed={
        <FilterFooter
          allSelected={allSelected}
          onClick={() =>
            onChange(allSelected ? [] : users.map((user) => user.id))
          }
        />
      }
    >
      {users.map((user) => {
        const name = user.name || '—'

        return (
          <ListBoxItem
            key={user.id}
            label={name}
            textValue={name}
            rightContent={<PersonCountSC>{user.count}</PersonCountSC>}
          />
        )
      })}
    </Select>
  )
}

const PersonSelectSC = styled.div(({ theme }) => ({
  paddingTop: theme.spacing.xxsmall,
  paddingBottom: theme.spacing.medium,
}))

const PersonCountSC = styled.span(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-input-disabled'],
}))
