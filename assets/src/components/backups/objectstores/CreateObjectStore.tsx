import { useState } from 'react'
import { Button } from '@pluralsh/design-system'

import { useOpenTransition } from '../../hooks/suspense/useOpenTransition'
import { ModalMountTransition } from '../../utils/ModalMountTransition'
import { useBackupsEnabled } from '../../cd/utils/useBackupsEnabled'

import SaveObjectStoreModal from './SaveObjectStoreModal'

export default function CreateObjectStore({
  refetch,
}: {
  refetch: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const { buttonProps } = useOpenTransition(isOpen, setIsOpen)
  const backupsEnabled = useBackupsEnabled()

  return (
    <>
      <Button
        primary
        {...buttonProps}
        {...(!backupsEnabled ? { disabled: true } : {})}
      >
        Create connection
      </Button>
      <ModalMountTransition open={isOpen}>
        <SaveObjectStoreModal
          open={isOpen}
          onClose={() => setIsOpen(false)}
          refetch={refetch}
        />
      </ModalMountTransition>
    </>
  )
}
