import { Prop, PropsContainer, UserDetails } from '../index'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'Props Container',
  component: PropsContainer,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template() {
  return (
    <PropsContainer
      title="Metadata"
      width={200}
    >
      <Prop title="Name">Test</Prop>
      <Prop title="Date">10 minutes ago</Prop>
      <Prop title="Owner">
        <UserDetails
          name="Test"
          email="test@test.com"
        />
      </Prop>
    </PropsContainer>
  )
}

export const Default: Story = {
  render: Template,
  args: {},
}

