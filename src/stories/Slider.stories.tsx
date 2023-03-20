import Slider from '../components/Slider'

export default {
  title: 'Slider',
  component: Slider,
}

function Template(args: any) {
  return <Slider {...args} />
}

export const Default = Template.bind({})
Default.args = {
  label: 'Applications',
  defaultValue: 30,
  minValue: 0,
  maxValue: 100,
  tickMarks: [
    { value: 0 },
    { value: 5 },
    { value: 10 },
    { value: 20 },
    { value: 30 },
    { value: 50, label: 'Fifty' },
    { value: 100, label: '💯' },
  ],
  thumbRadius: 12,
  tooltip: true,
  size: 600,
}
