import { LightDarkSwitch, Switch } from '..'
import type { StoryFn } from '@storybook/react'

export default {
  title: 'Switch',
  component: Switch,
}

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

export const Default: StoryFn = Template.bind({})

Default.args = {
  children: 'Email notifications',
  disabled: false,
  readOnly: false,
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

export const LightDarkMode: StoryFn = LightDarkTemplate.bind({})

LightDarkMode.args = {
  disabled: false,
  readOnly: false,
}
