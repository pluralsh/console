import { PropWide } from '../index'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'Prop Wide',
  component: PropWide,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template() {
  return <PropWide title="Name">Test</PropWide>
}

export const Default: Story = {
  render: Template,
  args: {},
}

