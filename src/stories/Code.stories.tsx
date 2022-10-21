import { Flex } from 'honorable'

import { Card, Code } from '..'

import { goCode, jsCode, tfCode } from '../constants'

export default {
  title: 'Code',
  component: Code,
  argTypes: {
    showLineNumbers: {
      control: {
        type: 'boolean', min: 0, max: 6000, step: 100,
      },
    },
    showHeader: {
      options: [undefined, true, false],
      control: {
        type: 'select', min: 0, max: 6000, step: 100,
      },
    },
  },
}

function Template(args:any) {
  return (
    <Flex
      direction="column"
      gap="medium"
    >
      <Code
        language="javascript"
        width="600px"
        {...args}
      >
        {jsCode}
      </Code>
      <Code
        language="terraform"
        width="600px"
        height="200px"
        {...args}
      >
        {tfCode}
      </Code>
      <Code
        width="600px"
        height="100px"
        {...args}
      >
        {jsCode}
      </Code>
      <Code
        language="go"
        width="400px"
        {...args}
      >
        {goCode}
      </Code>
      <Code
        width="400px"
        language="js"
        {...args}
      >
        console.log('test')
      </Code>
      <Code
        width="400px"
        {...args}
      >
        One line
      </Code>
      <Code
        width="400px"
        height="300px"
        {...args}
      >
        One line with `height` specified
      </Code>
      <Code
        width="400px"
        {...args}
      >
        {'Two lines\nTwo lines'}
      </Code>
      <Code
        width="400px"
        {...args}
      >
        {'Three lines\nThree lines\nThree lines'}
      </Code>

      <Card padding="medium">
        <Code
          language="javascript"
          {...args}
        >
          {jsCode}
        </Code>
      </Card>
    </Flex>
  )
}

export const Default = Template.bind({})
Default.args = {
  showLineNumbers: true,
  showHeader: undefined,
}
