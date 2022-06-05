import { RadioGroup } from 'honorable'

import Radio from '../components/Radio'

export default {
  title: 'Radio',
  component: Radio,
}

function Template(args: any) {
  return (
    <RadioGroup>
      <Radio
        value="0"
        {...args}
      >
        Implement design system
      </Radio>
      <Radio
        value="1"
        defaultChecked
        {...args}
      >
        Party hard
      </Radio>
    </RadioGroup>
  )
}

export const Default = Template.bind({})
Default.args = {
}

export const Small = Template.bind({})
Small.args = {
  small: true,
}
