import { Flex } from 'honorable'

import { goCode, jsCode, tfCode } from '../constants'

import { Divider, Highlight } from '..'

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

export const Default = Template.bind({})
