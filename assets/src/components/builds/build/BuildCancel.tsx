import { Button, CloseIcon, Modal } from '@pluralsh/design-system'
import { CANCEL_BUILD } from 'components/graphql/builds'
import { BuildStatus } from 'components/types'
import { useState } from 'react'
import { useMutation } from '@apollo/client'

const noncancelable = [
  BuildStatus.CANCELLED,
  BuildStatus.FAILED,
  BuildStatus.SUCCESSFUL,
]

export default function BuildCancel({ build }) {
  const [open, setOpen] = useState<boolean>(false)
  const [mutation, { loading }] = useMutation(CANCEL_BUILD, {
    variables: { id: build.id },
    onCompleted: () => setOpen(false),
  })

  if (noncancelable.includes(build.status)) return null

  return (
    <>
      <Button
        destructive
        startIcon={<CloseIcon />}
        onClick={() => setOpen(true)}
        width={200}
      >
        Cancel
      </Button>
      {open && (
        <Modal
          header="Cancel build"
          open={open}
          onClose={() => setOpen(false)}
          actions={
            <>
              <Button
                secondary
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                destructive
                disabled={loading}
                onClick={() => mutation()}
                marginLeft="medium"
                loading={loading}
              >
                Cancel build
              </Button>
            </>
          }
        >
          <p>Are you sure you want to cancel this build?</p>
        </Modal>
      )}
    </>
  )
}
