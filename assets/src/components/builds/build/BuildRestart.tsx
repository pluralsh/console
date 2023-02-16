import { Button, CraneIcon, Modal } from '@pluralsh/design-system'
import { RESTART_BUILD } from 'components/graphql/builds'
import { useState } from 'react'
import { useMutation } from '@apollo/client'
import { useNavigate } from 'react-router-dom'

export default function BuildRestart({ build: { id } }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState<boolean>(false)
  const [mutation, { loading }] = useMutation(RESTART_BUILD, {
    variables: { id },
    onCompleted: ({ restartBuild: { id } }) => {
      setOpen(false)
      navigate(`/builds/${id}`)
    },
  })

  return (
    <>
      <Button
        secondary
        fontWeight={600}
        startIcon={<CraneIcon />}
        onClick={() => setOpen(true)}
        width={200}
      >
        Restart
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
                onClick={() => mutation()}
                marginLeft="medium"
                loading={loading}
              >
                Restart build
              </Button>
            </>
          )}
        >
          <p>Are you sure you want to restart this build?</p>
        </Modal>
      )}
    </>
  )
}
