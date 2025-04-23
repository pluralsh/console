import { Button, IconFrame, ListIcon, Modal } from '@pluralsh/design-system'
import { useState } from 'react'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

export function PastReportsModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: Nullable<() => void>
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size={'large'}
      header="Past reports"
      actions={
        <Button
          secondary
          onClick={() => onClose?.()}
          flexGrow={1}
        >
          Close
        </Button>
      }
    >
      ...
    </Modal>
  )
}

export function PastReportsButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <IconFrame
        type={'floating'}
        size={'large'}
        icon={<ListIcon />}
        css={{ height: 42, width: 42 }}
        onClick={() => setOpen(true)}
      />
      <ModalMountTransition open={open}>
        <PastReportsModal
          open={open}
          onClose={() => setOpen(false)}
        />
      </ModalMountTransition>
    </>
  )
}
