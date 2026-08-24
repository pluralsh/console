import FormTitle from '../components/FormTitle'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'FormTitle',
  component: FormTitle,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template(args: any) {
  return (
    <FormTitle
      title={args.title}
      message={args.message}
    />
  )
}

export const Primary: Story = {
  render: Template,
  args: {
    title: 'Automatic Upgrades',
    message: 'Determine how this application is updated on a regular basis.',
  },
}
