import { useState } from 'react'
import { Button } from '@pluralsh/design-system'
import { CreateSecretModal } from './SecretModal.tsx'

export function CreateSecretButton({ text, refetch }) {
  const [open, setOpen] = useState(false)

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Button
        onClick={() => setOpen(true)}
        secondary
        floating
        css={{
          // align with the data select buttons
          height: '42px',
        }}
      >
        {text}
      </Button>
      {open && (
        <CreateSecretModal
          open={open}
          setOpen={setOpen}
          refetch={refetch}
        />
      )}
    </div>
  )
}
