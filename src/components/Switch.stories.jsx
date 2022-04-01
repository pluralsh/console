import { useState } from 'react'

import Switch from './Switch'

export default {
  title: 'Switch',
  component: Switch,
}

function Template(args) {
  const [checked, setChecked] = useState(false)

  return (
    <div>
      <Switch
        {...args}
        checked={checked}
        onChange={setChecked}
      />
    </div>
  )
}

export const Default = Template.bind({})

Default.args = {
}
