import { useState } from 'react'
import { Checkbox, Div } from 'honorable'

export default {
  title: 'Checkbox',
  component: Checkbox,
}

function Template(args: any) {
  const [checked, setChecked] = useState([true, true])

  return (
    <Div>
      <Checkbox
        {...args}
        checked={checked[0]}
        onChange={event => setChecked(checked => [event.target.checked, checked[1]])}
      >
        Implement design system
      </Checkbox>
      <Checkbox
        mt={0.5}
        {...args}
        checked={checked[1]}
        onChange={event => setChecked(checked => [checked[0], event.target.checked])}
      >
        Party hard
      </Checkbox>
    </Div>
  )
}

export const Default = Template.bind({})

Default.args = {
}
