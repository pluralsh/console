import { useMutation } from '@apollo/client'
import { Button, Modal } from '@pluralsh/design-system'
import { CANCEL_BUILD } from 'components/graphql/builds'
import { P } from 'honorable'

export default function BuildCancel({ open, setOpen, build }) {
  const [mutation, { loading }] = useMutation(CANCEL_BUILD, { variables: { id: build.id } })

  return (
    <Modal
      header="Cancel build"
      open={open}
      onClose={() => setOpen(false)}
      actions={(
        <>
          <Button
            secondary
            disabled={loading}
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
  )
}
