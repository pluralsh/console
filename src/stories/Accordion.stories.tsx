import { Accordion } from 'honorable'

export default {
  title: 'Accordion',
  component: Accordion,
}

function Template(args: any) {
  return <Accordion {...args} />
}

export const Default = Template.bind({})

Default.args = {
  title: 'Title',
  children: 'Content',
}

export const Ghost = Template.bind({})

Ghost.args = {
  ghost: true,
  title: 'Title',
  children: 'Content',
}
