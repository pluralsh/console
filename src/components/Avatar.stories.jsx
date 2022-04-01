import Avatar from './Avatar'

export default {
  title: 'Avatar',
  component: Avatar,
  argTypes: {
    backgroundColor: { control: 'color' },
  },
}

function Template(args) {
  return (
    <Avatar
      {...args}
    />
  )
}

export const Default = Template.bind({})

Default.args = {
  name: 'Jane Smith',
}

export const ComplexName = Template.bind({})

ComplexName.args = {
  name: 'Edgard Alan Poe',
}
