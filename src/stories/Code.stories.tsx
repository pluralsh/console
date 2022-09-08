import { Flex } from 'honorable'

import { Code } from '..'

import { goCode, jsCode, tfCode } from '../constants'

export default {
  title: 'Code',
  component: Code,
}

function Template() {
  return (
    <Flex
      direction="column"
      gap="medium"
    >
      <Code
        language="javascript"
        width="600px"
      >
        {jsCode}
      </Code>
      <Code
        language="terraform"
        width="600px"
        height="200px"
      >
        {tfCode}
      </Code>
      <Code
        width="600px"
        height="100px"
      >
        {jsCode}
      </Code>
      <Code
        language="go"
        width="400px"
      >
        {goCode}
      </Code>
      <Code
        width="400px"
        language="js"
      >
        console.log('test')
      </Code>
      <Code width="400px">
        One line
      </Code>
      <Code width="400px">
        {'Two lines\nTwo lines'}
      </Code>
      <Code width="400px">
        {'Three lines\nThree lines\nThree lines'}
      </Code>
    </Flex>
  )
}

export const Default = Template.bind({})
