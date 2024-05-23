import { Button } from '@pluralsh/design-system'
import { useState } from 'react'

import { ModalMountTransition } from '../../utils/ModalMountTransition'

import CreateStackModal from './CreateStackModal'

export default function CreateStack({
  refetch,
}: {
  refetch?: Nullable<() => void>
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>Create stack</Button>
      <ModalMountTransition open={open}>
        <CreateStackModal
          open={open}
          onClose={() => setOpen(false)}
          refetch={refetch}
        />
      </ModalMountTransition>
    </>
  )
}
