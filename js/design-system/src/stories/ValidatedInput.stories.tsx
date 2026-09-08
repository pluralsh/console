import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'

import ValidatedInput, {
  type ValidationResponse,
} from '../components/ValidatedInput'

const meta = {
  title: 'ValidatedInput',
  component: ValidatedInput,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

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

export const Default: Story = {
  render: Template,
}
