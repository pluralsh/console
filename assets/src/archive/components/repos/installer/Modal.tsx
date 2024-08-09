import { useState } from 'react'
import { Box, LayerPositionType } from 'grommet'
import { Button, DownloadIcon, Modal, Toast } from '@pluralsh/design-system'
import { Modal as HonorableModal } from 'honorable/dist/components/Modal/Modal'
import { useTheme } from 'styled-components'

import { Installer } from './Installer'

export function InstallerModal() {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [visible, setVisible] = useState(false)

  return (
    <Box>
      <Button
        small
        floating
        endIcon={<DownloadIcon size={14} />}
        onClick={() => setOpen(true)}
        id="installer"
      >
        Install
      </Button>

      <HonorableModal
        portal
        BackdropProps={{ zIndex: 20 }}
        open={open}
        fontSize={16}
        width={768}
        maxWidth={768}
        height={768}
        {...{
          paddingLeft: theme.spacing.large,
          paddingRight: theme.spacing.large,
          paddingTop: theme.spacing.large,
          paddingBottom: theme.spacing.large,
        }}
      >
        {open && (
          <Installer
            setOpen={setOpen}
            setConfirmClose={setConfirmClose}
            setVisible={setVisible}
          />
        )}
      </HonorableModal>

      <Modal
        header="confirm cancellation"
        open={confirmClose}
        actions={
          <>
            <Button
              secondary
              onClick={() => setConfirmClose(false)}
            >
              Cancel
            </Button>
            <Button
              destructive
              marginLeft="medium"
              onClick={() => {
                setConfirmClose(false)
                setOpen(false)
              }}
            >
              Continue
            </Button>
          </>
        }
        style={{
          padding: 0,
        }}
      >
        <p>
          Are you sure you want to cancel installation? You will lose all
          progress.
        </p>
      </Modal>

      {visible && (
        <Toast
          position={'bottom-right' as LayerPositionType}
          onClose={() => setVisible(false)}
          margin="large"
          marginRight="xxxxlarge"
          severity="success"
        >
          Successfully installed selected applications.
        </Toast>
      )}
    </Box>
  )
}
