import { Button } from 'honorable'

import DownloadIcon from './icons/DownloadIcon'

export default {
  title: 'Button',
  component: Button,
}

function Template(args: any) {
  return (
    <>
      <Button {...args} />
      <Button
        mt={1}
        startIcon={<DownloadIcon />}
        endIcon={<DownloadIcon />}
        {...args}
      />
    </>
  )
}

export const Primary = Template.bind({})

Primary.args = {
  disabled: false,
  children: 'Primary Button',
}

export const Secondary = Template.bind({})

Secondary.args = {
  secondary: true,
  disabled: false,
  children: 'Secondary Button',
}

export const PrimarySmall = Template.bind({})

PrimarySmall.args = {
  disabled: false,
  children: 'Primary Button',
  size: 'small',
}

export const SecondarySmall = Template.bind({})

SecondarySmall.args = {
  secondary: true,
  disabled: false,
  children: 'Secondary Button',
  size: 'small',
}

export const Disabled = Template.bind({})

Disabled.args = {
  disabled: true,
  children: 'Primary Button',
}
