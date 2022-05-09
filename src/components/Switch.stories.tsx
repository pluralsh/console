import { useState } from 'react'

import Switch from './Switch'

export default {
  title: 'Switch',
  component: Switch,
}

function Template(args: any) {
  const [checked, setChecked] = useState(false)

  return (
    <div>
      <Switch
        {...args}
        checked={checked}
        onChange={event => setChecked(event.target.checked)}
      />
    </div>
  )
}

export const Default = Template.bind({})

Default.args = {
}
