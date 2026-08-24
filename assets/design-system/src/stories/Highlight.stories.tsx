import { Flex } from 'honorable'

import { goCode, jsCode, tfCode } from '../constants'

import { Divider, Highlight } from '..'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'Highlight',
  component: Highlight,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template() {
  return (
    <Flex
      width="600px"
      direction="column"
      gap="medium"
    >
      <Divider text="Go" />
      <Highlight language="go">{goCode}</Highlight>
      <Divider text="JavaScript" />
      <Highlight language="js">{jsCode}</Highlight>
      <Divider text="Terraform" />
      <Highlight language="tf">{tfCode}</Highlight>
    </Flex>
  )
}

export const Default: Story = {
  render: Template,
}
