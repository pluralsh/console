import { useState } from 'react'

import Input from './Input'

export default {
  title: 'Input',
  component: Input,
}

function Template(args: any) {
  const [value, setValue] = useState('')

  return (
    <Input
      {...args}
      value={value}
      onChange={(event: any) => setValue(event.target.value)}
      style={{ width: 256 + 64 }}
    />
  )
}

export const Default = Template.bind({})

Default.args = {
}

export const Valid = Template.bind({})

Valid.args = {
  valid: true,
}

export const Error = Template.bind({})

Error.args = {
  error: true,
}

export const Placeholder = Template.bind({})

Placeholder.args = {
  placeholder: 'A neat placeholder!',
}
