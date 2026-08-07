import { useTheme } from 'styled-components'
import Button from '../components/Button'
import Flex from '../components/Flex'
import DownloadIcon from '../components/icons/DownloadIcon'
import type { StoryFn } from '@storybook/react'

export default {
  title: 'Button',
  component: Button,
  argTypes: {
    padding: {
      options: ['', 'none'],
      control: {
        type: 'select',
        labels: {
          // Can't have empty string as key for labels
          // Breaks controls for every other component that appears after this
          // '': 'Enabled',
          none: 'none',
        },
      },
    },
  },
}

function TemplateBase(args: any) {
  return (
    <Flex
      gap="medium"
      wrap="wrap"
      alignItems="center"
    >
      <Button
        large
        {...args}
      />
      <Button
        large
        startIcon={<DownloadIcon />}
        endIcon={<DownloadIcon />}
        {...args}
      />
      <Button {...args} />
      <Button
        startIcon={<DownloadIcon />}
        endIcon={<DownloadIcon />}
        {...args}
      />
      <Button
        small
        {...args}
      />
      <Button
        small
        startIcon={<DownloadIcon />}
        endIcon={<DownloadIcon />}
        {...args}
      />
    </Flex>
  )
}

function Template(args: any) {
  const theme = useTheme()
  return (
    <Flex
      direction="column"
      gap="large"
    >
      <Flex
        direction="column"
        gap="small"
      >
        <h1 css={{ ...theme.partials.text.subtitle2, margin: 0 }}>Enabled</h1>
        <TemplateBase {...args} />
      </Flex>
      <Flex
        direction="column"
        gap="small"
      >
        <h1 css={{ ...theme.partials.text.subtitle2, margin: 0 }}>Disabled</h1>
        <TemplateBase
          {...args}
          disabled
        />
      </Flex>
    </Flex>
  )
}

export const Primary: StoryFn = Template.bind({})

Primary.args = {
  disabled: false,
  loading: false,
  children: 'Primary Button',
}

export const SecondaryFloating: StoryFn = Template.bind({})

SecondaryFloating.args = {
  disabled: false,
  loading: false,
  children: 'Floating Button',
  floating: true,
}

export const SecondaryOutline: StoryFn = Template.bind({})

SecondaryOutline.args = {
  disabled: false,
  loading: false,
  children: 'Secondary Button',
  secondary: true,
}

export const Tertiary: StoryFn = Template.bind({})

Tertiary.args = {
  disabled: false,
  loading: false,
  children: 'Tertiary Button',
  tertiary: true,
  padding: '',
}

export const TertiaryNoPadding: StoryFn = Template.bind({})

TertiaryNoPadding.args = {
  disabled: false,
  loading: false,
  children: 'Tertiary Button',
  tertiary: true,
  padding: 'none',
}

export const Destructive: StoryFn = Template.bind({})

Destructive.args = {
  disabled: false,
  loading: false,
  children: 'Destructive Button',
  destructive: true,
}
