import RepositoryCard from '../components/RepositoryCard'
import Flex from '../components/Flex'
import type { Meta, StoryObj } from '@storybook/react'
import styled from 'styled-components'

const Heading = styled.h4(({ theme }) => ({
  margin: 0,
  marginBottom: 12,
  ...theme.partials.text.subtitle1,
}))

const meta = {
  title: 'Repository Card',
  component: RepositoryCard,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template(args: any) {
  return (
    <Flex
      gap="medium"
      direction="column"
      maxWidth={697}
    >
      <div style={{ marginBottom: 24 }}>
        <Heading>Default</Heading> <RepositoryCard {...args} />
      </div>
      <div style={{ marginBottom: 24 }}>
        <Heading>Marketing</Heading>
        <RepositoryCard
          variant="marketing"
          {...args}
        />
      </div>
      <div style={{ marginBottom: 24 }}>
        <Heading>Medium</Heading>
        <RepositoryCard
          size="medium"
          mt={1}
          {...args}
        />
      </div>
      <div style={{ marginBottom: 24 }}>
        <Heading>Large</Heading>
        <RepositoryCard
          size="large"
          mt={1}
          {...args}
        />
      </div>
    </Flex>
  )
}

function ListTemplate(args: any) {
  return (
    <Flex
      gap="small"
      wrap="wrap"
    >
      <RepositoryCard {...args} />
      <RepositoryCard
        {...{
          ...args,
          ...{
            description:
              'The new open-source standard to sync data from applications, APIs & databases. One click deploys for data scientists and developers.',
          },
        }}
      />
      <RepositoryCard
        {...{
          ...args,
          ...{
            description:
              'The new open-source standard to sync data from applications, APIs & databases. One click deploys for data scientists and developers.',
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
      <RepositoryCard
        {...args}
        releaseStatus="BETA"
      />
      <RepositoryCard
        {...args}
        releaseStatus="ALPHA"
      />
    </Flex>
  )
}

export const Default: Story = {
  render: Template,
  args: {
    installed: true,
    title: 'Plural',
    priv: true,
    verified: true,
    trending: true,
    publisher: 'Plural',
    featuredLabel: '',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    imageUrl: '/logos/plural-logomark-only-black.svg',
    tags: [
      'Devops',
      'Deployment',
      'Fun',
      'Turkey',
      'Chickens',
      'Handball',
      'Cricket',
      'Support',
    ],
  },
}

export const List: Story = {
  render: ListTemplate,
  args: { width: '500px', ...Default.args },
}
