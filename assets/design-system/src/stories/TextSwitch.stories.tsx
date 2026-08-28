import { type ComponentProps, useState } from 'react'
import { Flex } from 'honorable'

import TextSwitch from '../components/TextSwitch'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'TextSwitch',
  component: TextSwitch,
  argTypes: {
    size: {
      options: ['small'],
      control: { type: 'select' },
    },
  },
} satisfies Meta<any>

export default meta
const options1 = [
  {
    value: 'AND',
    label: 'All',
  },
  {
    value: 'OR',
    label: 'Any',
  },
] as const satisfies ComponentProps<typeof TextSwitch>['options']
const options2 = [
  {
    value: '0',
    label: 'one',
  },
  {
    value: '1',
    label: 'two',
  },
  {
    value: '2',
    label: 'three',
  },
  {
    value: '3',
    label: 'four',
  },
] as const satisfies ComponentProps<typeof TextSwitch>['options']

function Template({ label, ...args }: ComponentProps<typeof TextSwitch>) {
  const [selectedValue1, setSelectedValue1] = useState<string>(
    'AND' satisfies (typeof options1)[number]['value']
  )
  const [selectedValue2, setSelectedValue2] = useState<string>(
    '0' satisfies (typeof options2)[number]['value']
  )

  return (
    <Flex
      gap="medium"
      flexDirection="column"
    >
      <TextSwitch
        {...args}
        name="radio-group-controlled1"
        label={label || 'Match'}
        value={selectedValue1}
        onChange={(value) => setSelectedValue1(value as string)}
        options={options1}
      />
      <TextSwitch
        {...args}
        name="radio-group-controlled2"
        label={label || 'Options'}
        labelPosition="end"
        value={selectedValue2}
        onChange={(value) => setSelectedValue2(value as string)}
        options={options2}
      />
    </Flex>
  )
}

export const Default: StoryObj<Parameters<typeof Template>[0]> = {
  render: Template,
  args: {
    size: 'small',
    label: '',
    isDisabled: false,
  } as const satisfies Partial<ComponentProps<typeof TextSwitch>>,
}
