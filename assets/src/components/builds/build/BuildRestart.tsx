import { Button, CraneIcon, Modal } from '@pluralsh/design-system'
import { RESTART_BUILD } from 'components/graphql/builds'
import { P } from 'honorable'
import { useState } from 'react'
import { useMutation } from 'react-apollo'
import { useNavigate } from 'react-router-dom'

export default function BuildRestart({ build: { id } }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState<boolean>(false)
  const [mutation, { loading }] = useMutation(RESTART_BUILD, {
    variables: { id },
    onCompleted: ({ restartBuild: { id } }) => navigate(`/builds/${id}`),
  })

  return (
    <>
      <Button
        secondary
        fontWeight={600}
        marginTop="xxsmall"
        marginBottom="small"
        startIcon={<CraneIcon />}
        onClick={() => setOpen(true)}
        width={200}
      >
        Restart build
      </Button>
      {open && (
        <Modal
          header="Restart build"
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
                Restart build
              </Button>
            </>
          )}
        >
          <P>Are you sure you want to restart this build?</P>
        </Modal>
      )}
    </>
  )
}
