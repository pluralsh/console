import { Button } from 'honorable'

import BellIcon from '../components/icons/BellIcon'
import EmptyState from '../components/EmptyState'
import type { StoryFn } from '@storybook/react'

export default {
  title: 'EmptyState',
  component: EmptyState,
}

function Template(args: any) {
  return <EmptyState {...args} />
}

export const Default: StoryFn = Template.bind({})

Default.args = {
  message: 'This is an empty state',
  description: 'Some description.',
  icon: <BellIcon />,
  children: <Button>Click me!</Button>,
}
