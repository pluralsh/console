import { Radio } from '@pluralsh/design-system'
import { serviceStatusToLabel } from 'components/cd/services/ServiceStatusChip'
import {
  DisplayFilterSection,
  DisplayPanel,
  DisplayRadioGroup,
  DisplaySection,
  DisplaySortHeader,
  DisplayViewToggle,
} from 'components/utils/display/DisplayPanel'
import { FlowSort, ServiceDeploymentStatus } from 'generated/graphql'
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
      <DisplayFilterSection
        title="Service health"
        options={FLOW_HEALTH_OPTIONS}
        selected={state.statuses}
        counts={statusCounts}
        getLabel={serviceStatusToLabel}
        onChange={(statuses) => onChange({ ...state, statuses })}
      />
      <DisplaySection>
        <DisplaySortHeader
          direction={state.direction}
          onChange={(direction) => onChange({ ...state, direction })}
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
