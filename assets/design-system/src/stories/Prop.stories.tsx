import { Prop } from '../index'
import type { StoryFn } from '@storybook/react'

export default {
  title: 'Prop',
  component: Prop,
}

function Template() {
  return <Prop title="Name">Test</Prop>
}

export const Default: StoryFn = Template.bind({})
Default.args = {}
