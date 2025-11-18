import { Prop } from '../index'

export default {
  title: 'Prop',
  component: Prop,
}

function Template() {
  return <Prop title="Name">Test</Prop>
}

export const Default = Template.bind({})
Default.args = {}
