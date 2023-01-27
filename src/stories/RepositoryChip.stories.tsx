import RepositoryChip from '../components/RepositoryChip'
import StackIcon from '../components/icons/StackIcon'

export default {
  title: 'RepositoryChip',
  component: RepositoryChip,
}

function Template(args: any) {
  return (
    <>
      <RepositoryChip
        {...args}
      />
      <RepositoryChip
        checked
        marginTop="medium"
        {...args}
      />
    </>
  )
}

export const Default = Template.bind({})

Default.args = {
  imageUrl: '/logos/airbyte-logo.svg',
  label: 'Airbyte',
}

export const Icon = Template.bind({})

Icon.args = {
  icon: (
    <StackIcon />
  ),
  label: 'DevOps',
}

export const Small = Template.bind({})

Small.args = {
  imageUrl: '/logos/airbyte-logo.svg',
  label: 'Really long application name',
  width: '200px',
}
