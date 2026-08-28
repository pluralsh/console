import { A, Flex } from 'honorable'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'A',
  component: A,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template(args: any) {
  return (
    <Flex gap="medium">
      <A
        href="#"
        {...args}
      />
      <A
        href="https://github.com"
        {...args}
      >
        Github
      </A>
      <A
        href="#"
        inline
        {...args}
      >
        Inline
      </A>
    </Flex>
  )
}

export const Primary: Story = {
  render: Template,
  args: {
    children: 'Click me',
  },
}
