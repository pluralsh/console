import Divider from '../components/Divider'
import type { StoryFn } from '@storybook/react'

export default {
  title: 'Divider',
  component: Divider,
}

function Template(args: any) {
  return <Divider {...args} />
}

export const Default: StoryFn = Template.bind({})

Default.args = {
  text: '',
}

export const Text: StoryFn = Template.bind({})

Text.args = {
  text: "That's division allright!",
}
