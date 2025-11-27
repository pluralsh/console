import { Button, Flex } from 'honorable'
import { useState } from 'react'

import { type LayerPositionType } from '../components/Layer'
import { GraphQLToast, Toast, type ToastSeverity } from '../components/Toast'

export default {
  title: 'Toast',
  component: Toast,
  argTypes: {
    severity: {
      options: ['info', 'success', 'error'],
      control: { type: 'radio' },
    },
    closeTimeout: {
      control: {
        type: 'number',
      },
    },
  },
}

type Args = {
  severity: ToastSeverity
  closeTimeout?: number
}

function Template(args: Args) {
  const [showToast, setShowToast] = useState(false)
  const [position, setPosition] = useState('' as LayerPositionType)
  const handleClick = (visible: boolean, position: LayerPositionType) => {
    setShowToast(visible)
    setPosition(position)
  }

  return (
    <Flex
      gap="medium"
      direction="column"
    >
      <Flex
        gap="medium"
        alignItems="center"
        justify="center"
      >
        <Button onClick={() => handleClick(true, 'top-left')}>Top Left</Button>
        <Button onClick={() => handleClick(true, 'top')}>Top</Button>
        <Button onClick={() => handleClick(true, 'top-right')}>
          Top Right
        </Button>
      </Flex>
      <Flex
        gap="medium"
        alignItems="center"
        justify="center"
      >
        <Button onClick={() => handleClick(true, 'left')}>Left</Button>
        <Button onClick={() => handleClick(true, 'center')}>Center</Button>
        <Button onClick={() => handleClick(true, 'right')}>Right</Button>
      </Flex>
      <Flex
        gap="medium"
        alignItems="center"
        justify="center"
      >
        <Button onClick={() => handleClick(true, 'bottom-left')}>
          Bottom Left
        </Button>
        <Button onClick={() => handleClick(true, 'bottom')}>Bottom</Button>
        <Button onClick={() => handleClick(true, 'bottom-right')}>
          Bottom Right
        </Button>
      </Flex>

      <Toast
        show={showToast}
        position={position}
        onClose={() => setShowToast(false)}
        margin="large"
        severity={args.severity}
        closeTimeout={args.closeTimeout}
      >
        Hello
      </Toast>
    </Flex>
  )
}

function GraphQLTemplate() {
  const [visible, setVisible] = useState(false)
  const handleClick = (visible: boolean) => {
    setVisible(visible)
  }

  return (
    <Flex>
      <Button onClick={() => handleClick(true)}>Show</Button>
      <GraphQLToast
        show={visible}
        margin="large"
        onClose={() => setVisible(false)}
        error={{
          graphQLErrors: [
            {
              message: 'XYZ could not be found',
            },
          ],
        }}
        header="404 Not Found"
      />
    </Flex>
  )
}

export const Default = Template.bind({})

Default.args = {
  severity: 'success',
  closeTimeout: undefined,
}

export const GraphQL = GraphQLTemplate.bind({})

GraphQL.args = {}
