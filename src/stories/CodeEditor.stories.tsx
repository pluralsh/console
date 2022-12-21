import { Div, Flex } from 'honorable'

import { Card, CodeEditor, WrapWithIf } from '..'

import { goCode, jsCode, tfCode } from '../constants'

export default {
  title: 'Code Editor',
  component: CodeEditor,
  argTypes: {
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
        <CodeEditor
          language="hcl"
          value={tfCode}
          width="600px"
          height="300px"
          save
          saveLabel="Commit"
          {...args}
        />
        <CodeEditor
          language="javascript"
          value={jsCode}
          width="600px"
          height="200px"
          {...args}
        />
        <Div height={200}>
          <CodeEditor
            language="go"
            value={goCode}
            width="400px"
            {...args}
          />
        </Div>
      </Flex>
    </WrapWithIf>
  )
}

export const Default = Template.bind({})
Default.args = {
  options: { lineNumbers: true },
}
