import { UserDetails } from '../index'
import type { StoryFn } from '@storybook/react'

export default {
  title: 'User Details',
  component: UserDetails,
}

function Template() {
  return (
    <UserDetails
      name="Test"
      email="test@test.com"
    />
  )
}

export const Default: StoryFn = Template.bind({})
Default.args = {}
