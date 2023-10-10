import { ReactElement, useCallback, useState } from 'react'
import { Button, Modal } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { CreateClusterContent } from './CreateClusterContent'

export default function CreateCluster(): ReactElement {
  const theme = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const onClose = useCallback(() => setIsOpen(false), [])

  const onSubmit = useCallback(() => {
    // TODO
  }, [])

  const disabled = true // TODO: add logic
  const loading = false

  return (
    <>
      <Button
        primary
        onClick={() => setIsOpen(true)}
      >
        Create cluster
      </Button>
      <Modal
        header="Create a cluster"
        size="large"
        style={{ padding: 0 }}
        BackdropProps={{
          justifyContent: 'flex-start',
          paddingTop: 128,
        }}
        open={isOpen}
        portal
        onClose={onClose}
        actions={
          <div
            css={{
              display: 'flex',
              gap: theme.spacing.small,
            }}
          >
            <Button
              secondary
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={disabled}
              loading={loading}
              primary
            >
              Create cluster
            </Button>
          </div>
        }
      >
        <CreateClusterContent />
      </Modal>
    </>
  )
}
