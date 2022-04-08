import UserCard from './UserCard'

export default {
  title: 'UserCard',
  component: UserCard,
}

function Template(args) {
  return (
    <UserCard
      {...args}
    />
  )
}

export const Default = Template.bind({})

Default.args = {
  user: {
    name: 'Jane Smith',
    email: 'jane.smith@plural.sh',
  },
}

export const NoEmail = Template.bind({})

NoEmail.args = {
  user: {
    name: 'Jane Smith',
  },
}
