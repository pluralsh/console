import Divider from '../components/Divider'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'Divider',
  component: Divider,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template(args: any) {
  return <Divider {...args} />
}

export const Default: Story = {
  render: Template,
  args: {
    text: '',
  },
}

export const Text: Story = {
  render: Template,
  args: {
    text: "That's division allright!",
  },
}
