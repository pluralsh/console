import { Switch } from 'honorable'

export default {
  title: 'Switch',
  component: Switch,
}

function Template(args: any) {
  return (
    <Switch {...args} />
  )
}

export const Default = Template.bind({})

Default.args = {
  children: 'Email notifications',
}
