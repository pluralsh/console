import { Radio } from '@pluralsh/design-system'
import { serviceStatusToLabel } from 'components/cd/services/ServiceStatusChip'
import {
  DisplayFilterRow,
  DisplayFilterRows,
  DisplayPanel,
  DisplayRadioGroup,
  DisplaySection,
  DisplaySectionHeader,
  DisplaySortHeader,
  DisplayViewToggle,
  toggleListValue,
} from 'components/utils/display/DisplayPanel'
import {
  FlowSort,
  FlowSortDirection,
  ServiceDeploymentStatus,
} from 'generated/graphql'
import { FLOW_HEALTH_OPTIONS, FlowsDisplayState } from './flowsDisplay'

export function FlowsDisplayPanel({
  state,
  onChange,
  statusCounts,
}: {
  state: FlowsDisplayState
  onChange: (next: FlowsDisplayState) => void
  statusCounts: Partial<Record<ServiceDeploymentStatus, number>>
}) {
  return (
    <DisplayPanel>
      <DisplayViewToggle
        view={state.view}
        onChange={(view) => onChange({ ...state, view })}
      />
      <DisplaySection>
        <DisplaySectionHeader>Service health</DisplaySectionHeader>
        <DisplayFilterRows>
          {FLOW_HEALTH_OPTIONS.map((status) => (
            <DisplayFilterRow
              key={status}
              label={serviceStatusToLabel(status)}
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
        </DisplayFilterRows>
      </DisplaySection>
      <DisplaySection>
        <DisplaySortHeader
          descending={state.direction === FlowSortDirection.Desc}
          onToggle={() =>
            onChange({
              ...state,
              direction:
                state.direction === FlowSortDirection.Desc
                  ? FlowSortDirection.Asc
                  : FlowSortDirection.Desc,
            })
          }
        />
        <DisplayRadioGroup
          value={state.sort}
          onChange={(value) => onChange({ ...state, sort: value as FlowSort })}
        >
          <Radio
            small
            value={FlowSort.Name}
          >
            Flow name
          </Radio>
          <Radio
            small
            value={FlowSort.ServiceCount}
          >
            Number of services
          </Radio>
          <Radio
            small
            value={FlowSort.Favorited}
          >
            Favorited flows
          </Radio>
        </DisplayRadioGroup>
      </DisplaySection>
    </DisplayPanel>
  )
}
