import { Div, Flex } from 'honorable'

import RepositoryCard from '../components/RepositoryCard'

export default {
  title: 'RepositoryCard',
  component: RepositoryCard,
}

function Template(args: any) {
  return (
    <Div maxWidth="500px">
      <RepositoryCard
        {...args}
      />
    </Div>
  )
}

function ListTemplate(args: any) {
  return (
    <Flex
      gap="small"
      align="stretch"
      wrap="wrap"
      maxWidth="1000px"
    >
      
      <RepositoryCard
        width="40%"
        flexGrow={1}
        minWidth="300px"
        {...args}
      />
      <RepositoryCard
        width="40%"
        flexGrow={1}
        minWidth="300px"
        {...{
          ...args,
          ...{
            description: 'The new open-source standard to sync data from applications, APIs & databases. One click deploys for data scientists and developers.',
          },
        }}
      />
      <RepositoryCard
        width="40%"
        flexGrow={1}
        minWidth="300px"
        {...{
          ...args,
          ...{
            description: 'The new open-source standard to sync data from applications, APIs & databases. One click deploys for data scientists and developers.',
            tags: null,
          },
        }}
      />
      <RepositoryCard
        width="40%"
        flexGrow={1}
        minWidth="300px"
        {...{
          ...args,
          ...{
            priv: true,
            description: null,
            tags: ['tag1', 'tag2'],
          },
        }}
      />

    </Flex>
  )
}

export const Default = Template.bind({})

Default.args = {
  installed: true,
  title: 'Plural',
  priv: false,
  publisher: 'Plural',
  description: 'One click deploys for data scientists and developers',
  imageUrl: '/plural-logo.png',
  tags: ['Devops', 'Deployment', 'Fun', 'Turkey', 'Chickens', 'Handball', 'Cricket', 'Support'],
}

export const List = ListTemplate.bind({})
List.args = { ...Default.args }

