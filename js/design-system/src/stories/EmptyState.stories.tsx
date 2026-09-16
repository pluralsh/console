import BellIcon from '../components/icons/BellIcon'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'Empty State',
  component: EmptyState,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template(args: any) {
  return <EmptyState {...args} />
}

export const Default: Story = {
  render: Template,
  args: {
    message: 'This is an empty state',
    description: 'Some description.',
    icon: <BellIcon />,
    children: <Button>Click me!</Button>,
  },
}
