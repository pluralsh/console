import { Codeline } from '..'

export default {
  title: 'Codeline',
  component: Codeline,
}

function Template(args: any) {
  return (
    <Codeline {...args} />
  )
}

export const Default = Template.bind({})

Default.args = {
  children: 'npm i pluralsh-design-system',
}
