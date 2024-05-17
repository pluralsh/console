import { Button, Tooltip } from '@pluralsh/design-system'
import { ButtonProps } from 'honorable'
import { ReactNode, useState } from 'react'

import { ModalMountTransition } from '../../utils/ModalMountTransition'

import CreateStackModal from './CreateStackModal'

export default function CreateStack({
  buttonContent = 'Create stack',
  buttonProps,
  refetch,
}: {
  buttonProps?: ButtonProps
  buttonContent?: string | ReactNode
  refetch?: Nullable<() => void>
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Tooltip label="Create stack">
        <Button
          {...buttonProps}
          onClick={() => setOpen(true)}
        >
          {buttonContent}
        </Button>
      </Tooltip>
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
