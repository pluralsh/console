import { Flex, H3 } from 'honorable'

import RepositoryCard from '../components/RepositoryCard'

export default {
  title: 'RepositoryCard',
  component: RepositoryCard,
}

function Template(args: any) {
  return (
    <Flex
      gap={16}
      direction="column"
    >
      <H3>Small</H3>
      <RepositoryCard
        {...args}
      />

      <H3>Medium</H3>
      <RepositoryCard
        size="medium"
        {...args}
      />

      <H3>Large</H3>
      <RepositoryCard
        size="large"
        {...args}
      />
    </Flex>
  )
}

function ListTemplate(args: any) {
  return (
    <Flex
      gap="small"
      direction="column"
    >
      <H3>Small Card List</H3>
      <Flex
        gap="small"
        wrap="wrap"
      >
        <RepositoryCard
          {...args}
        />
        <RepositoryCard
          {...{
            ...args,
            ...{
              description: 'The new open-source standard to sync data from applications, APIs & databases. One click deploys for data scientists and developers.',
            },
          }}
        />
        <RepositoryCard
          {...{
            ...args,
            ...{
              description: 'The new open-source standard to sync data from applications, APIs & databases. One click deploys for data scientists and developers.',
              tags: null,
            },
          }}
        />
        <RepositoryCard
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

      <H3>Medium Card List</H3>
      <Flex
        gap="small"
        wrap="wrap"
      >
        <RepositoryCard
          size="medium"
          {...args}
        />
        <RepositoryCard
          size="medium"
          {...{
            ...args,
            ...{
              description: 'The new open-source standard to sync data from applications, APIs & databases. One click deploys for data scientists and developers.',
            },
          }}
        />
        <RepositoryCard
          size="medium"
          {...{
            ...args,
            ...{
              description: 'The new open-source standard to sync data from applications, APIs & databases. One click deploys for data scientists and developers.',
              tags: null,
            },
          }}
        />
        <RepositoryCard
          size="medium"
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

      <H3>Large Card List</H3>
      <Flex
        gap="small"
        wrap="wrap"
      >
        <RepositoryCard
          size="large"
          {...args}
        />
        <RepositoryCard
          size="large"
          {...{
            ...args,
            ...{
              description: 'The new open-source standard to sync data from applications, APIs & databases. One click deploys for data scientists and developers.',
            },
          }}
        />
        <RepositoryCard
          size="large"
          {...{
            ...args,
            ...{
              description: 'The new open-source standard to sync data from applications, APIs & databases. One click deploys for data scientists and developers.',
              tags: null,
            },
          }}
        />
        <RepositoryCard
          size="large"
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
    </Flex>
  )
}

export const Default = Template.bind({})

Default.args = {
  installed: true,
  title: 'Plural',
  priv: true,
  verified: true,
  publisher: 'Plural',
  description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  imageUrl: '/logos/plural-logomark-only-black.svg',
  tags: ['Devops', 'Deployment', 'Fun', 'Turkey', 'Chickens', 'Handball', 'Cricket', 'Support'],
}

export const List = ListTemplate.bind({})
List.args = { ...Default.args }

