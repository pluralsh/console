import ProgressBar from '../components/ProgressBar'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'Progress Bar',
  component: ProgressBar,
  argTypes: {
    progress: {
      control: {
        type: 'range',
        min: 0,
        max: 1,
        step: 0.05,
      },
    },
  },
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

export const Indeterminate: Story = {
  render: ProgressBar,
  args: {
    paused: false,
    complete: false,
  },
}

export const Determinate: Story = {
  render: ProgressBar,
  args: {
    paused: false,
    complete: false,
    mode: 'determinate',
    progress: 0.25,
  },
}

