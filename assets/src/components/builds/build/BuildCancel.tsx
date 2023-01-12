import { Button, CloseIcon, Modal } from '@pluralsh/design-system'
import { CANCEL_BUILD } from 'components/graphql/builds'
import { BuildStatus } from 'components/types'
import { P } from 'honorable'
import { useState } from 'react'
import { useMutation } from '@apollo/client'

export default function BuildCancel({ build }) {
  const [open, setOpen] = useState<boolean>(false)
  const [mutation, { loading }] = useMutation(CANCEL_BUILD, { variables: { id: build.id } })

  if (build.status === BuildStatus.FAILED || build.status === BuildStatus.SUCCESSFUL) return null

  return (
    <>
      <Button
        secondary
        fontWeight={600}
        startIcon={<CloseIcon />}
        onClick={() => setOpen(true)}
        width={200}
      >
        Cancel build
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
                onClick={() => {
                  mutation()
                  setOpen(false)
                }}
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
