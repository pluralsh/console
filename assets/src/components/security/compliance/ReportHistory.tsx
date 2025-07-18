import {
  Button,
  Flex,
  IconFrame,
  ListIcon,
  Modal,
} from '@pluralsh/design-system'
import { useState } from 'react'
import { useTheme } from 'styled-components'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

export function ReportHistoryModal({
  name,
  open,
  onClose,
}: {
  name: string
  open: boolean
  onClose: Nullable<() => void>
}) {
  const theme = useTheme()

  return (
    <Modal
      open={open}
      onClose={onClose}
      asForm
      onSubmit={() => {}}
      header={
        <Flex
          align={'center'}
          justify={'space-between'}
        >
          Report history
          <Button
            secondary
            small
            onClick={() => onClose?.()}
          >
            Close
          </Button>
        </Flex>
      }
    >
      ...
    </Modal>
  )
}

export function ReportHistory({ name }: { name: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <IconFrame
        clickable
        onClick={() => setOpen(true)}
        icon={<ListIcon />}
        type={'floating'}
      />
      <ModalMountTransition open={open}>
        <ReportHistoryModal
          name={name}
          open={open}
          onClose={() => setOpen(false)}
        />
      </ModalMountTransition>
    </>
  )
}
