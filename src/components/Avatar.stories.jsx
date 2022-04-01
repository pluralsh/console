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

export const Image = Template.bind({})

Image.args = {
  imageUrl: 'https://avatars.githubusercontent.com/u/4154003?v=4',
}
