import {
  Button,
  Div,
  Flex,
  FlexProps,
} from 'honorable'
import { ComponentProps, useState } from 'react'

import { IconFrame, InfoIcon, Modal } from '..'

import Tooltip from '../components/Tooltip'

export default {
  title: 'Tooltip',
  component: Tooltip,
}

function CornerBox(props: FlexProps) {
  return (
    <Flex
      width="100%"
      padding={20}
      {...props}
    />
  )
}

function Tip({ onClick, ...props }: any) {
  return (
    <Tooltip
      label="Click me to see me in a modal!"
      {...props}
    >
      <Button onClick={onClick}>Hover me</Button>
    </Tooltip>
  )
}

function ModalExample({
  tipProps,
  onClose,
  ...props
}: ComponentProps<typeof Modal> & {
  tipProps: ComponentProps<typeof Tooltip>
}) {
  return (
    <Modal
      portal
      onClose={onClose}
      header="Hover the below buttons"
      actions={(
        <>
          <Tooltip
            {...tipProps}
            label="I should be on top of the modal"
          >
            <Button
              secondary
              onClick={() => onClose()}
            >
              Cancel
            </Button>
          </Tooltip>
          <Tooltip
            {...tipProps}
            label="I should be on top of the modal"
          >
            <Button
              primary
              marginLeft="medium"
              onClick={() => onClose()}
            >
              Done
            </Button>
          </Tooltip>
        </>
      )}
      {...props}
    >
      <>
        {new Array(10).map(() => (
          <IconFrame
            tooltip
            textValue="Some extra info"
            icon={<InfoIcon />}
            size="medium"
          />
        ))}
      </>
    </Modal>
  )
}

function Template(args: any) {
  const [showModal, setShowModal] = useState(false)

  return (
    <Div margin="-32px">
      <Flex
        width="100%"
        height="33vh"
        alignItems="stretch"
      >
        <CornerBox
          alignItems="flex-start"
          justifyContent="left"
        >
          <Tip
            {...args}
            onClick={() => setShowModal(true)}
          />
        </CornerBox>
        <CornerBox
          alignItems="flex-start"
          justifyContent="right"
        >
          <Tip
            {...args}
            onClick={() => setShowModal(true)}
          />
        </CornerBox>
      </Flex>
      <Flex
        width="100%"
        height="33.3vh"
        alignItems="stretch"
      >
        <CornerBox
          alignItems="center"
          justifyContent="center"
        >
          <Tip
            {...args}
            onClick={() => setShowModal(true)}
          />
        </CornerBox>
      </Flex>
      <Flex
        width="100%"
        height="33vh"
        alignItems="stretch"
      >
        <CornerBox
          alignItems="flex-end"
          justifyContent="left"
        >
          <Tip
            {...args}
            onClick={() => setShowModal(true)}
          />
        </CornerBox>
        <CornerBox
          alignItems="flex-end"
          justifyContent="right"
        >
          <Tip
            {...args}
            onClick={() => setShowModal(true)}
          />
        </CornerBox>
      </Flex>
      <ModalExample
        open={showModal}
        onClose={() => setShowModal(false)}
        tipProps={args}
      />
    </Div>
  )
}

export const Default = Template.bind({})

Default.args = {}
