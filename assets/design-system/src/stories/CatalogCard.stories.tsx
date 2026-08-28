import { Div } from 'honorable'

import CatalogCard from '../components/CatalogCard'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'CatalogCard',
  component: CatalogCard,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template(args: any) {
  return (
    <Div
      display="grid"
      gap="large"
      gridTemplateColumns="repeat(auto-fit, minmax(256px, 1fr))"
    >
      <CatalogCard {...args} />
      <CatalogCard {...args} />
      <CatalogCard {...args} />
      <CatalogCard {...args} />
      <CatalogCard
        {...{
          ...args,

          ...{
            imageUrl: '/logos/plural-logomark-only-white.svg',
            tags: ['Loooooooooooooooooooong', 'Short'],
          },
        }}
      />
      <CatalogCard
        {...{
          ...args,
          ...{
            category: null,
            description: null,
            imageUrl: '/logos/plural-logomark-only-white.svg',
            tags: ['Tag-1', 'Tag-2', 'Tag-3'],
          },
        }}
      />
    </Div>
  )
}

export const Default: Story = {
  render: Template,
  args: {
    name: 'Base catalog',
    author: 'Plural',
    category: 'Messaging',
    description:
      'The new open-source standard to sync data from applications, APIs & databases. One click deploys for data scientists and developers.',
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
