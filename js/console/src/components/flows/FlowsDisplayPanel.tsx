import { Radio } from '@pluralsh/design-system'
import {
  DisplayFilterRow,
  DisplayFilterRows,
  DisplayPanel,
  DisplayRadioGroup,
  DisplaySection,
  DisplaySectionHeader,
  DisplaySortHeader,
  DisplayViewToggle,
} from 'components/utils/display/DisplayPanel'
import { ServiceDeploymentStatus } from 'generated/graphql'
import { includes } from 'lodash'
import {
  FLOW_HEALTH_OPTIONS,
  FlowsDisplayState,
  FlowsSort,
  toggleListValue,
} from './flowsDisplay'

const HEALTH_LABELS: Record<(typeof FLOW_HEALTH_OPTIONS)[number], string> = {
  [ServiceDeploymentStatus.Healthy]: 'Healthy',
  [ServiceDeploymentStatus.Failed]: 'Failed',
  [ServiceDeploymentStatus.Stale]: 'Stale',
}

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
              label={HEALTH_LABELS[status]}
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
        </DisplayFilterRows>
      </DisplaySection>
      <DisplaySection>
        <DisplaySortHeader
          descending={state.direction === 'desc'}
          onToggle={() =>
            onChange({
              ...state,
              direction: state.direction === 'desc' ? 'asc' : 'desc',
            })
          }
        />
        <DisplayRadioGroup
          value={state.sort}
          onChange={(value) => onChange({ ...state, sort: value as FlowsSort })}
        >
          <Radio
            small
            value="name"
          >
            Flow name
          </Radio>
          <Radio
            small
            value="serviceCount"
          >
            Number of services
          </Radio>
          <Radio
            small
            value="favorited"
          >
            Favorited flows
          </Radio>
        </DisplayRadioGroup>
      </DisplaySection>
    </DisplayPanel>
  )
}
