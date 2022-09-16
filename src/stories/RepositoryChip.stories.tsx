import RepositoryChip from '../components/RepositoryChip'

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
