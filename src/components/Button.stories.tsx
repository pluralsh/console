import { Button } from 'honorable'

import DownloadIcon from './icons/DownloadIcon'

export default {
  title: 'Button',
  component: Button,
}

function Template(args: any) {
  return (
    <>
      <Button
        large
        {...args}
      />
      <Button
        mt={1}
        large
        startIcon={<DownloadIcon />}
        endIcon={<DownloadIcon />}
        {...args}
      />
      <Button
        mt={1}
        {...args}
      />
      <Button
        mt={1}
        startIcon={<DownloadIcon />}
        endIcon={<DownloadIcon />}
        {...args}
      />
      <Button
        mt={1}
        small
        {...args}
      />
      <Button
        mt={1}
        small
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
  loading: false,
  children: 'Primary Button',
}

export const Secondary = Template.bind({})

Secondary.args = {
  disabled: false,
  loading: false,
  children: 'Secondary Button',
  secondary: true,
}

export const Tertiary = Template.bind({})

Tertiary.args = {
  disabled: false,
  loading: false,
  children: 'Tertiary Button',
  tertiary: true,
}
