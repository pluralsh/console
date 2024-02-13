import { useState } from 'react'
import { IconFrame, PencilIcon } from '@pluralsh/design-system'

import { ModalMountTransition } from '../../utils/ModalMountTransition'
import { useBackupsEnabled } from '../../cd/utils/useBackupsEnabled'
import { ObjectStore } from '../../../generated/graphql'

import CreateObjectStoreModal from './CreateObjectStoreModal'

export default function UpdateObjectStore({
  objectStore,
  refetch,
}: {
  objectStore: ObjectStore
  refetch: Nullable<() => void>
}) {
  const [isOpen, setIsOpen] = useState(false)
  const backupsEnabled = useBackupsEnabled()

  return (
    <>
      <IconFrame
        size="medium"
        clickable
        disabled={!backupsEnabled}
        icon={<PencilIcon />}
        textValue="Edit"
        tooltip
        onClick={() => setIsOpen(true)}
      />
      <ModalMountTransition open={isOpen}>
        <CreateObjectStoreModal
          open={isOpen}
          onClose={() => setIsOpen(false)}
          refetch={refetch}
          objectStore={objectStore}
        />
      </ModalMountTransition>
    </>
  )
}
