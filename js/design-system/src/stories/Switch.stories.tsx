import { LightDarkSwitch, Switch } from '..'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'Switch',
  component: Switch,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template(args: any) {
  return (
    <Switch
      {...args}
      onChange={(val) => {
        console.info('Switched changed to', val)
      }}
    />
  )
}

export const Default: Story = {
  render: Template,
  args: {
    children: 'Email notifications',
    disabled: false,
    readOnly: false,
  },
}

function LightDarkTemplate(args: any) {
  return (
    <LightDarkSwitch
      {...args}
      onChange={(val) => {
        console.info('Switched changed to', val)
      }}
    />
  )
}

export const LightDarkMode: Story = {
  render: LightDarkTemplate,
  args: {
    disabled: false,
    readOnly: false,
  },
}
