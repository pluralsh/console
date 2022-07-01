import { Button, H1 } from 'honorable'

import DownloadIcon from '../components/icons/DownloadIcon'

export default {
  title: 'Button',
  component: Button,
}

function TemplateBase(args: any) {
  return (
    <>
      <Button
        large
        {...args}
      />
      <Button
        marginTop="medium"
        large
        startIcon={<DownloadIcon />}
        endIcon={<DownloadIcon />}
        {...args}
      />
      <Button
        marginTop="medium"
        {...args}
      />
      <Button
        marginTop="medium"
        startIcon={<DownloadIcon />}
        endIcon={<DownloadIcon />}
        {...args}
      />
      <Button
        marginTop="medium"
        small
        {...args}
      />
      <Button
        marginTop="medium"
        small
        startIcon={<DownloadIcon />}
        endIcon={<DownloadIcon />}
        {...args}
      />
    </>
  )
}

function Template(args: any) {
  return (
    <>
      <H1
        subtitle2
        marginBottom="small"
      >Enabled
      </H1>

      <TemplateBase {...args} />
      <H1
        subtitle2
        marginTop="large"
        marginBottom="small"
      >Disabled
      </H1>
      <TemplateBase
        {...args}
        disabled
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

export const Destructive = Template.bind({})

Destructive.args = {
  disabled: false,
  loading: false,
  children: 'Destructive Button',
  destructive: true,
}
