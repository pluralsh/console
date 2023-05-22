import { Div } from 'honorable'
import { type Key, useState } from 'react'

import { Button, Checkbox } from '..'

export default {
  title: 'Checkbox',
  component: Checkbox,
}

type CheckedVal = 'checked' | 'unchecked' | 'indeterminate'
type CheckedVals = Record<string, CheckedVal>

const checks: Record<Key, { label: string; startVal: CheckedVal }> = {
  0: {
    label: 'Drawing',
    startVal: 'indeterminate',
  },
  1: {
    label: 'Sports',
    startVal: 'checked',
  },
  2: {
    label: 'Reading',
    startVal: 'unchecked',
  },
  3: {
    label: 'Music',
    startVal: 'indeterminate',
  },
}
const initialCheckedVals: CheckedVals = {}

for (const [key, { startVal }] of Object.entries(checks)) {
  initialCheckedVals[key] = startVal || 'indeterminate'
}

function Template(args: any) {
  const [checkedVals, setCheckedVals] = useState(initialCheckedVals)

  return (
    <>
      <h1>Controlled</h1>
      <Div>
        {Object.entries(checks).map(([value, { label }]) => (
          <Checkbox
            key={value}
            name="options"
            value={value}
            checked={checkedVals[value] === 'checked'}
            onChange={({ target: { checked } }: any) => {
              setCheckedVals({
                ...checkedVals,
                [value]: checked ? 'checked' : 'unchecked',
              })
            }}
            indeterminate={checkedVals[value] === 'indeterminate'}
            {...args}
          >
            {label}
          </Checkbox>
        ))}
        <Button
          marginTop="medium"
          onClick={() => setCheckedVals(initialCheckedVals)}
        >
          Reset
        </Button>
      </Div>
      <h1>Uncontrolled</h1>
      <Div>
        {Object.entries(checks).map(([value, { label }]) => (
          <Checkbox
            key={value}
            name="options"
            value={value}
            {...args}
          >
            {label}
          </Checkbox>
        ))}
      </Div>
    </>
  )
}

export const Default = Template.bind({})
Default.args = {
  small: false,
  disabled: false,
  defaultSelected: false,
  tabIndex: 0,
}

export const Small = Template.bind({})
Small.args = {
  small: true,
  disabled: false,
  defaultSelected: false,
  tabIndex: 0,
}
