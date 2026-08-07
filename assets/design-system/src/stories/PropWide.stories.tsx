import { PropWide } from '../index'
import type { StoryFn } from '@storybook/react'

export default {
  title: 'Prop Wide',
  component: PropWide,
}

function Template() {
  return <PropWide title="Name">Test</PropWide>
}

export const Default: StoryFn = Template.bind({})
Default.args = {}
