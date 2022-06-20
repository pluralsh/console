import { useState } from 'react'

import ValidatedInput, { ValidationResponse } from '../components/ValidatedInput'

export default {
  title: 'ValidatedInput',
  component: ValidatedInput,
}

function Template() {
  const [value, setValue] = useState('')

  return (
    <ValidatedInput
      value={value}
      onChange={(e: any) => setValue(e.target.value)}
      width="500px"
      label="input needs to be looong"
      validation={(v: string) : ValidationResponse => v.length < 4 ? { error: true, message: 'too short' } : { error: false, message: 'long enough!' }}
    />
  )
} 

export const Default = Template.bind({})
