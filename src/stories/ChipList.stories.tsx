import { ComponentProps } from 'react'

import Chip from '../components/Chip'
import Card from '../components/Card'
import ChipList from '../components/ChipList'
import WrapWithIf from '../components/WrapWithIf'

const sizes: ComponentProps<typeof Chip>['size'][] = [
  'small',
  'medium',
  'large',
]

const severities: ComponentProps<typeof Chip>['severity'][] = [
  'neutral',
  'info',
  'success',
  'warning',
  'error',
  'critical',
]

export default {
  title: 'ChipList',
  component: ChipList,
  argTypes: {
    size: {
      options: sizes,
    },
    severity: {
      options: severities,
    },
    onFillLevel: {
      options: [0, 1, 2, 3],
      control: {
        type: 'select',
        labels: {
          0: '0',
          1: '1',
          2: '2',
          3: "3 - Shouldn't be used",
        },
      },
    },
  },
}

function TextTemplate({ onFillLevel, ...args }: any) {
  const VALUES = [
    'avengers',
    'iron man',
    'doctor strange',
    'thor',
    'black panther',
    'guardians of the galaxy',
  ]

  return (
    <WrapWithIf
      condition={onFillLevel > 0}
      wrapper={
        <Card
          width="600px"
          padding="medium"
          fillLevel={onFillLevel}
        />
      }
    >
      <ChipList
        values={VALUES}
        {...args}
      />
    </WrapWithIf>
  )
}

interface Label {
  key?: string
  value: string
}

function LabelTemplate({ onFillLevel, ...args }: any) {
  const VALUES: Array<Label> = [
    { key: 'app', value: 'plural' },
    { key: 'version', value: 'v1.8.11' },
    { key: 'managed-by', value: 'helm' },
    { key: 'controlled-by', value: 'deployment-1234' },
    { value: 'just-a-value' },
  ]

  return (
    <WrapWithIf
      condition={onFillLevel > 0}
      wrapper={
        <Card
          width="600px"
          padding="medium"
          fillLevel={onFillLevel}
        />
      }
    >
      <ChipList<Label>
        values={VALUES}
        transformValue={(v) => `${v.key?.concat(':') ?? ''} ${v.value}`}
        {...args}
      />
    </WrapWithIf>
  )
}

function EmptyTemplate({ onFillLevel, ...args }: any) {
  return (
    <WrapWithIf
      condition={onFillLevel > 0}
      wrapper={
        <Card
          width="600px"
          padding="medium"
          fillLevel={onFillLevel}
        />
      }
    >
      <ChipList
        values={[]}
        {...args}
      />
    </WrapWithIf>
  )
}

export const Text = TextTemplate.bind({})
Text.args = {
  severity: 'info',
  size: 'small',
  onFillLevel: 0,
}

export const Label = LabelTemplate.bind({})
Label.args = {
  severity: 'info',
  size: 'small',
  onFillLevel: 0,
}

export const Empty = EmptyTemplate.bind({})
Empty.args = {
  severity: 'info',
  size: 'small',
  onFillLevel: 0,
}
