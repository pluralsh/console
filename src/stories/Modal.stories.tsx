import { Button } from 'honorable'
import { useState } from 'react'

import Modal from '../components/Modal'

export default {
  title: 'Modal',
  component: Modal,
}

function Template(args: any) {
  return (
    <Modal
      {...args}
    >
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

export const Default = Template.bind({})

Default.args = {
  title: 'A cool modal',
}

export const OnClose = Template2.bind({})

OnClose.args = {
  title: 'A cool controlled modal',
}
