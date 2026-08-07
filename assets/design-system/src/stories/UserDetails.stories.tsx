import { UserDetails } from '../index'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'User Details',
  component: UserDetails,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template() {
  return (
    <UserDetails
      name="Test"
      email="test@test.com"
    />
  )
}

export const Default: Story = {
  render: Template,
  args: {},
}
