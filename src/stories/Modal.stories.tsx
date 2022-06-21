import { Button } from 'honorable'
import { useState } from 'react'

import { ModalActions } from '..'

import Modal from '../components/Modal'

export default {
  title: 'Modal',
  component: Modal,
}

function Template(args: any) {
  return (
    <Modal {...args}>
      Modal content
    </Modal>
  )
}

function Template2(args: any) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        Open
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        {...args}
      />
    </>
  )
}

function Template3(args: any) {
  return (
    <Modal
      {...args}
      onClose={() => null}
    >
      Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
      <ModalActions>
        <Button secondary>
          An action
        </Button>
        <Button
          primary
          marginLeft="medium"
        >
          An action
        </Button>
      </ModalActions>
    </Modal>
  )
}

export const Default = Template.bind({})

Default.args = {
  title: 'A cool modal',
}

export const OnClose = Template2.bind({})

OnClose.args = {
  title: 'A cool controlled modal',
}
export const RealWorld = Template3.bind({})

RealWorld.args = {
  title: 'A cool modal',
}
