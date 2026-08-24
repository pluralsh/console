import { Prop } from '../index'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'Prop',
  component: Prop,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template() {
  return <Prop title="Name">Test</Prop>
}

export const Default: Story = {
  render: Template,
  args: {},
}
