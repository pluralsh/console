import { Button } from 'honorable'

import BellIcon from '../components/icons/BellIcon'
import EmptyState from '../components/EmptyState'

export default {
  title: 'EmptyState',
  component: EmptyState,
}

function Template(args: any) {
  return <EmptyState {...args} />
}

export const Default = Template.bind({})

Default.args = {
  message: 'This is an empty state',
  description: 'Some description.',
  icon: <BellIcon />,
  children: <Button>Click me!</Button>,
}
