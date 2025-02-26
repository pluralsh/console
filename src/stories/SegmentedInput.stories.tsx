import { useState } from 'react'
import styled from 'styled-components'
import { Segment, SegmentedInput } from '..'

type StoryProps = {
  format: string
  separator: string
  segments?: Segment[]
}

const DATE_SEGMENTS = [
  { length: 2, max: 12, name: 'MM', initialVal: '01' },
  { length: 2, min: 1, max: 31, name: 'DD', initialVal: '15' },
  { length: 4, max: 9999, name: 'YYYY', initialVal: '2023' },
]

const CUSTOM_SEGMENTS = [
  { length: 3, max: 999, name: 'XXX', initialVal: '' },
  { length: 3, max: 999, name: 'YYY', initialVal: '' },
  { length: 3, max: 999, name: 'ZZZ', initialVal: '' },
]

const EMPTY_SEGMENTS = [
  { length: 2, max: 12, name: 'MM' },
  { length: 2, min: 1, max: 31, name: 'DD' },
  { length: 4, max: 9999, name: 'YYYY' },
]

export default {
  title: 'SegmentedInput',
  component: SegmentedInput,
  argTypes: {
    format: {
      options: ['date', 'custom'],
      control: { type: 'select' },
      defaultValue: 'date',
    },
    separator: {
      control: { type: 'text' },
      defaultValue: '/',
    },
  },
}

const WrapperSC = styled.div(({ theme }) => ({
  maxWidth: '300px',
  marginBottom: theme.spacing.large,
}))

const DemoHeadingSC = styled.h3(({ theme }) => ({
  ...theme.partials.text.subtitle2,
  marginBottom: theme.spacing.medium,
}))

function Template({ format, separator, segments }: StoryProps) {
  const [dateValue, setDateValue] = useState('')
  const [customValue, setCustomValue] = useState('')

  switch (format) {
    case 'date':
      return (
        <WrapperSC>
          <DemoHeadingSC>
            Date Input (MM{separator}DD{separator}YYYY)
          </DemoHeadingSC>
          <SegmentedInput
            onChange={setDateValue}
            separator={separator}
            segments={segments || DATE_SEGMENTS}
          />
          <div css={{ marginTop: '8px' }}>Value: {dateValue}</div>
        </WrapperSC>
      )
    case 'custom':
      return (
        <WrapperSC>
          <DemoHeadingSC>
            Custom Format (XXX{separator}YYY{separator}ZZZ)
          </DemoHeadingSC>
          <SegmentedInput
            onChange={setCustomValue}
            separator={separator}
            segments={segments || CUSTOM_SEGMENTS}
          />
          <div css={{ marginTop: '8px' }}>Value: {customValue}</div>
        </WrapperSC>
      )
    default:
      return (
        <WrapperSC>
          <DemoHeadingSC>Empty Input</DemoHeadingSC>
          <SegmentedInput
            onChange={() => {}}
            separator={separator}
            segments={segments || EMPTY_SEGMENTS}
            placeholder="Enter date..."
          />
        </WrapperSC>
      )
  }
}

export const DateInput = Template.bind({})
DateInput.args = {
  format: 'date',
  separator: '/',
  segments: DATE_SEGMENTS,
}

export const CustomFormatInput = Template.bind({})
CustomFormatInput.args = {
  format: 'custom',
  separator: '.',
  segments: CUSTOM_SEGMENTS,
}
