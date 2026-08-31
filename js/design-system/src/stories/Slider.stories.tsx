import Slider from '../components/Slider'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'Slider',
  component: Slider,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template(args: any) {
  return <Slider {...args} />
}

export const Default: Story = {
  render: Template,
  args: {
    label: 'Applications',
    defaultValue: 30,
    minValue: 0,
    maxValue: 100,
    tickMarks: [
      { value: 0 },
      { value: 5 },
      { value: 10 },
      { value: 20 },
      { value: 30 },
      { value: 50, label: 'Fifty' },
      { value: 100, label: '💯' },
    ],
    thumbRadius: 12,
    tooltip: true,
    size: 600,
    colorized: true,
  },
}
