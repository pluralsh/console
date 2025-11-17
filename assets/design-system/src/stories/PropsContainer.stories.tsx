import { Prop, PropsContainer, UserDetails } from '../index'

export default {
  title: 'Props Container',
  component: PropsContainer,
}

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

export const Default = Template.bind({})
Default.args = {}
