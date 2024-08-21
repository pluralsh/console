import { Button, Tooltip } from '@pluralsh/design-system'
import { ReactNode, useState } from 'react'
import { ButtonProps } from 'honorable'

import CreateStackModal from './CreateStackModal'

export default function CreateStack({
  refetch,
  buttonContent = 'Create stack',
  buttonProps,
}: {
  refetch?: Nullable<() => void>
  buttonProps?: ButtonProps
  buttonContent?: string | ReactNode
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
      <CreateStackModal
        open={open}
        onClose={() => setOpen(false)}
        refetch={refetch}
      />
    </>
  )
}
