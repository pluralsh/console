import RepositoryChip from '../components/RepositoryChip'
import StackIcon from '../components/icons/StackIcon'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'RepositoryChip',
  component: RepositoryChip,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template(args: any) {
  return (
    <>
      <RepositoryChip {...args} />
      <RepositoryChip
        checked
        marginTop="medium"
        {...args}
      />
    </>
  )
}

export const Default: Story = {
  render: Template,
  args: {
    imageUrl: '/logos/airbyte-logo.svg',
    label: 'Airbyte',
  },
}

export const Icon: Story = {
  render: Template,
  args: {
    icon: <StackIcon />,
    label: 'DevOps',
  },
}

export const Small: Story = {
  render: Template,
  args: {
    imageUrl: '/logos/airbyte-logo.svg',
    label: 'Really long application name',
    width: '200px',
  },
}

