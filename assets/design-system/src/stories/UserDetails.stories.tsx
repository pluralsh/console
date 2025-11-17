import { UserDetails } from '../index'

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

export const Default = Template.bind({})
Default.args = {}
