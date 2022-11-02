import { Flex } from 'honorable'

import { Card, Code, WrapWithIf } from '..'

import { goCode, jsCode, tfCode } from '../constants'

export default {
  title: 'Code',
  component: Code,
  argTypes: {
    title: {
      control: 'text',
    },
    showLineNumbers: {
      control: {
        type: 'boolean',
      },
    },
    showHeader: {
      options: [undefined, true, false],
      control: {
        type: 'select',
      },
    },
    onFillLevel: {
      options: [0, 1, 2, 3],
      control: {
        type: 'select',
        labels: {
          0: '0',
          1: '1',
          2: "2 - Shouldn't be used",
          3: "3 - Shouldn't be used",
        },
      },
    },
    height: {
      control: {
        type: 'number',
      },
    },
  },
}

function Template({ onFillLevel, ...args }: any) {
  return (
    <WrapWithIf
      condition={onFillLevel > 0}
      wrapper={(
        <Card
          fillLevel={onFillLevel}
          padding="medium"
        />
      )}
    >
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
          console.warn('test')
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
        <Code
          language="javascript"
          {...args}
        >
          {jsCode}
        </Code>
      </Flex>
    </WrapWithIf>
  )
}

function WithTabsTemplate({ onFillLevel, title, ...args }: any) {
  return (
    <WrapWithIf
      condition={onFillLevel > 0}
      wrapper={(
        <Card
          fillLevel={onFillLevel}
          padding="medium"
        />
      )}
    >
      {' '}
      <Flex
        direction="column"
        gap="medium"
      >
        <Code
          title={title}
          tabs={[
            {
              key: 'go',
              label: 'Go',
              language: 'golang',
              content: goCode,
            },
            {
              key: 'tf',
              label: 'Terraform',
              language: 'terraform',
              content: tfCode,
            },
            {
              key: 'js',
              label: 'Javascript',
              language: 'javascript',
              content: "const oneLine = 'Just one line'",
            },
          ]}
          {...args}
        />
      </Flex>
    </WrapWithIf>
  )
}

export const Default = Template.bind({})
Default.args = {
  title: '',
  showLineNumbers: true,
  showHeader: undefined,
}

export const WithTabs = WithTabsTemplate.bind({})
WithTabsTemplate.args = {
  title: 'This is an optional title',
  showLineNumbers: true,
  showHeader: undefined,
  onFillLevel: 0,
  height: 300,
}
