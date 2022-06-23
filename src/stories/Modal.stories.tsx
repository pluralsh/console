import { Button } from 'honorable'
import { useState } from 'react'

import { Modal, ModalActions, ModalHeader } from '..'

export default {
  title: 'Modal',
  component: Modal,
}

function Template() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        Open
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
      >
        <ModalHeader onClose={() => setOpen(false)}>
          Modal Title
        </ModalHeader>
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
    </>
  )
}

export const RealWorld = Template.bind({})

RealWorld.args = {}
