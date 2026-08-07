import RepositoryChip from '../components/RepositoryChip'
import StackIcon from '../components/icons/StackIcon'
import type { StoryFn } from '@storybook/react'

export default {
  title: 'RepositoryChip',
  component: RepositoryChip,
}

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

export const Default: StoryFn = Template.bind({})

Default.args = {
  imageUrl: '/logos/airbyte-logo.svg',
  label: 'Airbyte',
}

export const Icon: StoryFn = Template.bind({})

Icon.args = {
  icon: <StackIcon />,
  label: 'DevOps',
}

export const Small: StoryFn = Template.bind({})

Small.args = {
  imageUrl: '/logos/airbyte-logo.svg',
  label: 'Really long application name',
  width: '200px',
}
