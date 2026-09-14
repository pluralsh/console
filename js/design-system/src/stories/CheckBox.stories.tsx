import { useState } from 'react'

import { type Key } from '@react-types/shared'

import styled from 'styled-components'

import { Button, Checkbox } from '..'
import type { Meta, StoryObj } from '@storybook/react'

const H1 = styled.h1(({ theme }) => ({
  ...theme.partials.text.subtitle1,
  '&:not(:first-child)': {
    marginTop: theme.spacing.xxlarge,
  },
}))

const meta = {
  title: 'Checkbox',
  component: Checkbox,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

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
      <H1>Controlled</H1>
      <div>
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
      </div>
      <H1>Uncontrolled</H1>
      <div>
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
      </div>
    </>
  )
}

export const Default: Story = {
  render: Template,
  args: {
    small: false,
    disabled: false,
    defaultSelected: false,
    tabIndex: 0,
  },
}

export const Small: Story = {
  render: Template,
  args: {
    small: true,
    disabled: false,
    defaultSelected: false,
    tabIndex: 0,
  },
}
