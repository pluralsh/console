import RepositoryCard from './RepositoryCard'

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
  subtitle: 'One click deploys for data scientists and developers',
  imageUrl: '/plural-logo.png',
  children: 'Effortlessly deploy and operate production-ready open-source applications in minutes.',
}

export const Featured = Template.bind({})

Featured.args = {
  featured: true,
  installed: false,
  title: 'Plural',
  subtitle: 'One click deploys for data scientists and developers',
  imageUrl: '/plural-logo.png',
  children: 'Effortlessly deploy and operate production-ready open-source applications in minutes.',
}
