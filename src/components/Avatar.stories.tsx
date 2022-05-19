import { Avatar } from 'honorable'

export default {
  title: 'Avatar',
  component: Avatar,
}

function Template(args: any) {
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
  src: 'https://avatars.githubusercontent.com/u/4154003?v=4',
}

export const Small = Template.bind({})

Small.args = {
  name: 'Jane Smith',
  size: 32,
}
