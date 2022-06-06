import RepositoryCard from '../components/RepositoryCard'

export default {
  title: 'RepositoryCard',
  component: RepositoryCard,
}

function Template(args: any) {
  return (
    <RepositoryCard
      {...args}
    />
  )
}

export const Default = Template.bind({})

Default.args = {
  installed: true,
  title: 'Plural',
  publisher: 'Plural',
  description: 'One click deploys for data scientists and developers',
  imageUrl: '/plural-logo.png',
  tags: ['Devops', 'Deployment', 'Fun'],
}
