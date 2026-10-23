import { Radio } from '@pluralsh/design-system'
import {
  DisplayPanel,
  DisplayRadioGroup,
  DisplaySection,
  DisplaySortHeader,
  DisplayViewToggle,
} from 'components/utils/display/DisplayPanel'
import { WorkbenchSort } from 'generated/graphql'
import { WorkbenchesDisplayState } from './workbenchesDisplay'

const SORT_OPTIONS: { value: WorkbenchSort; label: string }[] = [
  { value: WorkbenchSort.Name, label: 'Workbench name' },
  { value: WorkbenchSort.UpdatedAt, label: 'Last updated' },
  { value: WorkbenchSort.InsertedAt, label: 'Date created' },
  { value: WorkbenchSort.Favorited, label: 'Favorited workbenches' },
]

export function WorkbenchesDisplayPanel({
  state,
  onChange,
}: {
  state: WorkbenchesDisplayState
  onChange: (next: WorkbenchesDisplayState) => void
}) {
  return (
    <DisplayPanel>
      <DisplayViewToggle
        view={state.view}
        onChange={(view) => onChange({ ...state, view })}
      />
      <DisplaySection>
        <DisplaySortHeader
          direction={state.direction}
          onChange={(direction) => onChange({ ...state, direction })}
        />
        <DisplayRadioGroup
          value={state.sort}
          onChange={(value) =>
            onChange({ ...state, sort: value as WorkbenchSort })
          }
        >
          {SORT_OPTIONS.map(({ value, label }) => (
            <Radio
              key={value}
              small
              value={value}
            >
              {label}
            </Radio>
          ))}
        </DisplayRadioGroup>
      </DisplaySection>
    </DisplayPanel>
  )
}
