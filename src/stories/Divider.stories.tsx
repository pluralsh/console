import Divider from '../components/Divider'

export default {
  title: 'Divider',
  component: Divider,
}

function Template(args: any) {
  return (
    <Divider
      {...args}
    />
  )
}

export const Default = Template.bind({})

Default.args = {
  text: '',
}

export const Text = Template.bind({})

Text.args = {
  text: 'That\'s division allright!',
}
