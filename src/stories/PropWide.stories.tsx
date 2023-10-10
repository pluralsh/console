import { PropWide } from '../index'

export default {
  title: 'Prop Wide',
  component: PropWide,
}

function Template() {
  return <PropWide title="Name">Test</PropWide>
}

export const Default = Template.bind({})
Default.args = {}
