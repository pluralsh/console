import { Avatar } from 'honorable'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'Avatar',
  component: Avatar,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template(args: any) {
  return <Avatar {...args} />
}

export const Default: Story = {
  render: Template,
  args: {
    name: 'Jane Smith',
  },
}

export const ComplexName: Story = {
  render: Template,
  args: {
    name: 'Edgard Alan Poe',
  },
}

export const Image: Story = {
  render: Template,
  args: {
    src: 'https://avatars.githubusercontent.com/u/4154003?v=4',
  },
}

export const Small: Story = {
  render: Template,
  args: {
    name: 'Jane Smith',
    size: 32,
  },
}
