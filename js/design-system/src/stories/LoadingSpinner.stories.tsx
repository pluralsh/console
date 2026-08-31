import { Div } from 'honorable'
import type { Meta, StoryObj } from '@storybook/react'

import LoadingSpinner, {
  type LoadingSpinnerProps,
} from '../components/LoadingSpinner'

const meta = {
  title: 'LoadingSpinner',
  component: LoadingSpinner,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template(args: LoadingSpinnerProps) {
  return (
    <Div position="relative">
      <Div
        position="absolute"
        top="0"
        bottom={0}
        right={0}
        left={0}
        backgroundColor="red"
      >
        <Div
          width="100%"
          position="relative"
        >
          <LoadingSpinner {...args} />
        </Div>
      </Div>
    </Div>
  )
}

export const Primary: Story = {
  render: Template,
  args: {
    show: true,
    spinnerDelay: 200,
    spinnerWidth: 96,
    centered: true,
    animateTransitions: true,
  },
}
