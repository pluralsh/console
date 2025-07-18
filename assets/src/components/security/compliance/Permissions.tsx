import {
  Button,
  Flex,
  IconFrame,
  Modal,
  PeopleIcon,
} from '@pluralsh/design-system'
import { useState } from 'react'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

export function PermissionsModal({
  name,
  open,
  onClose,
}: {
  name: string
  open: boolean
  onClose: Nullable<() => void>
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size={'large'}
      header={
        <Flex
          align={'center'}
          justify={'space-between'}
        >
          Permissions
          <Button
            secondary
            small
            onClick={() => onClose?.()}
          >
            Cancel
          </Button>
        </Flex>
      }
      css={{ maxHeight: '75vh' }}
    >
      {name}
    </Modal>
  )
}

export function Permissions({ name }: { name: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <IconFrame
        tooltip={'View permissions'}
        clickable
        onClick={() => setOpen(true)}
        icon={<PeopleIcon />}
        type={'floating'}
      />
      <ModalMountTransition open={open}>
        <PermissionsModal
          name={name}
          open={open}
          onClose={() => setOpen(false)}
        />
      </ModalMountTransition>
    </>
  )
}
