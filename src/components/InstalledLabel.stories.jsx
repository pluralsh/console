import InstalledLabel from './InstalledLabel'

export default {
  title: 'InstalledLabel',
  component: InstalledLabel,
}

function Template(args) {

  return (
    <InstalledLabel
      {...args}
    />
  )
}

export const Default = Template.bind({})

Default.args = {
}

export const Label = Template.bind({})

Label.args = {
  label: 'Custom label',
}
