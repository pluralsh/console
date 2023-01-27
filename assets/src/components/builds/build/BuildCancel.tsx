import { Button, CloseIcon, Modal } from '@pluralsh/design-system'
import { CANCEL_BUILD } from 'components/graphql/builds'
import { BuildStatus } from 'components/types'
import { P } from 'honorable'
import { useState } from 'react'
import { useMutation } from '@apollo/client'

export default function BuildCancel({ build }) {
  const [open, setOpen] = useState<boolean>(false)
  const [mutation, { loading }] = useMutation(CANCEL_BUILD, {
    variables: { id: build.id },
    onCompleted: () => setOpen(false),
  })

  if (build.status === BuildStatus.FAILED || build.status === BuildStatus.SUCCESSFUL) return null

  return (
    <>
      <Button
        destructive
        fontWeight={600}
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
          actions={(
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
          )}
        >
          <P>Are you sure you want to cancel this build?</P>
        </Modal>
      )}
    </>
  )
}
