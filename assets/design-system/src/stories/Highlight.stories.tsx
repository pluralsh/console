import { Flex } from 'honorable'

import { goCode, jsCode, tfCode } from '../constants'

import { Divider, Highlight } from '..'
import type { StoryFn } from '@storybook/react'

export default {
  title: 'Highlight',
  component: Highlight,
}

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

export const Default: StoryFn = Template.bind({})
