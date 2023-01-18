import { Button, Modal } from '@pluralsh/design-system'
import { RESTART_BUILD } from 'components/graphql/builds'
import { P } from 'honorable'
import { useMutation } from '@apollo/client'
import { useNavigate } from 'react-router-dom'

export default function BuildRestart({ open, setOpen, build: { id } }) {
  const navigate = useNavigate()
  const [mutation, { loading }] = useMutation(RESTART_BUILD, {
    variables: { id },
    onCompleted: ({ restartBuild: { id } }) => navigate(`/builds/${id}`),
  })

  return (
    <Modal
      header="Restart build"
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
            Restart build
          </Button>
        </>
      )}
    >
      <P>Are you sure you want to restart this build?</P>
    </Modal>
  )
}
