import { useState } from 'react'

import CheckBox from './CheckBox'

export default {
  title: 'CheckBox',
  component: CheckBox,
}

function Template(args) {
  const [checked, setChecked] = useState([true, true])

  return (
    <>
      <div>
        <CheckBox
          {...args}
          label="Implement design system"
          checked={checked[0]}
          onChange={event => setChecked(checked => [event.target.checked, checked[1]])}
        />
      </div>
      <div style={{ marginTop: '0.5rem' }}>
        <CheckBox
          {...args}
          label="Party hard"
          checked={checked[1]}
          onChange={event => setChecked(checked => [checked[0], event.target.checked])}
        />
      </div>
    </>
  )
}

export const Default = Template.bind({})

Default.args = {
}
