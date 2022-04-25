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
  children: 'Click me',
}

export const Secondary = Template.bind({})

Secondary.args = {
  secondary: true,
  disabled: false,
  children: 'Click me',
}

export const PrimarySmall = Template.bind({})

PrimarySmall.args = {
  primary: true,
  disabled: false,
  children: 'Click me',
  size: 'small',
}

export const SecondarySmall = Template.bind({})

SecondarySmall.args = {
  secondary: true,
  disabled: false,
  children: 'Click me',
  size: 'small',
}

export const Disabled = Template.bind({})

Disabled.args = {
  primary: true,
  disabled: true,
  children: 'Click me',
}
