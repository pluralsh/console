import { useState } from 'react'

import TextInput from './TextInput'

export default {
  title: 'TextInput',
  component: TextInput,
}

function Template(args) {
  const [value, setValue] = useState('')

  return (
    <div>
      <TextInput
        {...args}
        value={value}
        onChange={event => setValue(event.target.value)}
        style={{ width: 256 + 64 }}
      />
    </div>
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
