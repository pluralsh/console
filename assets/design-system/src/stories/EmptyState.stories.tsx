import { Button } from 'honorable'

import BellIcon from '../components/icons/BellIcon'
import EmptyState from '../components/EmptyState'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'EmptyState',
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

