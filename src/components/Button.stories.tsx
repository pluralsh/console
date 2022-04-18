import Button from './Button'

export default {
  title: 'Button',
  component: Button,
}

function Template(args: any) {
  return (
    <Button {...args} />
  )
}

export const Primary = Template.bind({})

Primary.args = {
  primary: true,
  disabled: false,
  label: 'Click me',
}

export const Secondary = Template.bind({})

Secondary.args = {
  secondary: true,
  disabled: false,
  label: 'Click me',
}

export const PrimarySmall = Template.bind({})

PrimarySmall.args = {
  primary: true,
  disabled: false,
  label: 'Click me',
  size: 'small',
}

export const SecondarySmall = Template.bind({})

SecondarySmall.args = {
  secondary: true,
  disabled: false,
  label: 'Click me',
  size: 'small',
}

export const Disabled = Template.bind({})

Disabled.args = {
  primary: true,
  disabled: true,
  label: 'Click me',
}
