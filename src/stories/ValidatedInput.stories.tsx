import { useState } from 'react'

import ValidatedInput, {
  type ValidationResponse,
} from '../components/ValidatedInput'

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
      label="Name"
      hint="Name needs to be at least 5 characters long."
      validation={(v: string): ValidationResponse =>
        v.length < 5
          ? {
              error: true,
              message:
                'Provided name is too short. Name needs to be at least 5 characters long.',
            }
          : null
      }
    />
  )
}

export const Default = Template.bind({})
