import { useState } from 'react'

import FormField from './FormField'
import Input from './Input'

export default {
  title: 'FormField',
  component: FormField,
}

function Template(args: any) {
  const [value, setValue] = useState('')
  const { valid, error } = args

  return (
    <FormField
      {...args}
      style={{ width: 256 + 64 }}
    >
      <Input
        valid={valid}
        error={error}
        // @ts-ignore
        value={value}
        onChange={(event: any) => setValue(event.target.value)}
      />
    </FormField>
  )
}

export const Default = Template.bind({})

Default.args = {
}

export const Label = Template.bind({})

Label.args = {
  label: 'Email',
}

export const Required = Template.bind({})

Required.args = {
  label: 'Email',
  required: true,
}

export const Caption = Template.bind({})

Caption.args = {
  label: 'Password',
  caption: 'At least 8 characters',
}

export const LongCaption = Template.bind({})

LongCaption.args = {
  label: 'Password',
  caption: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
}

export const Valid = Template.bind({})

Valid.args = {
  label: 'Password',
  caption: 'At least 8 characters',
  valid: true,
}

export const Error = Template.bind({})

Error.args = {
  label: 'Password',
  caption: 'At least 8 characters',
  error: true,
}
