import { Avatar } from 'honorable'
import type { StoryFn } from '@storybook/react'

export default {
  title: 'Avatar',
  component: Avatar,
}

function Template(args: any) {
  return <Avatar {...args} />
}

export const Default: StoryFn = Template.bind({})

Default.args = {
  name: 'Jane Smith',
}

export const ComplexName: StoryFn = Template.bind({})

ComplexName.args = {
  name: 'Edgard Alan Poe',
}

export const Image: StoryFn = Template.bind({})

Image.args = {
  src: 'https://avatars.githubusercontent.com/u/4154003?v=4',
}

export const Small: StoryFn = Template.bind({})

Small.args = {
  name: 'Jane Smith',
  size: 32,
}
