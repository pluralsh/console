import { Flex } from 'honorable'

import { Codeline } from '..'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'Codeline',
  component: Codeline,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template(args: any) {
  return (
    <Flex
      direction="column"
      gap="medium"
    >
      <Codeline {...args} />
      <Codeline
        displayText="••••••••••"
        {...args}
      />
      <Codeline
        {...args}
        maxWidth="200px"
      />
    </Flex>
  )
}

function CustomCopyTemplate(args: any) {
  const onCopy = (text: string): Promise<void> =>
    window.navigator.clipboard.writeText(text)

  return (
    <Flex
      direction="column"
      gap="medium"
    >
      <span>
        This codeline copy uses a custom onCopy function that returns a promise!
      </span>
      <Codeline
        onCopyClick={onCopy}
        {...args}
      />
    </Flex>
  )
}

export const Default: Story = {
  render: Template,
  args: {
    children: 'npm i @pluralsh/design-system',
  },
}

export const CustomCopy: Story = {
  render: CustomCopyTemplate,
  args: {
    children: 'npm i @pluralsh/design-system',
  },
}

