import styled from 'styled-components'
import { ReactElement } from 'react'
import { Button, Modal } from '@pluralsh/design-system'

const DeleteClient = styled(DeleteClientUnstyled)(() => ({
  '.modalContainer': {
    padding: 0,

    // This is to fix modal width when truncated table row applies 100% width to all children.
    '& > div': {
      width: 'auto',
    },
  },
}))

function DeleteClientUnstyled({ onClose, ...props }): ReactElement {
  return (
    <div {...props}>
      <Modal
        header="delete vpn client"
        open
        onClose={onClose}
        size="large"
        className="modalContainer"
      >
        <ModalContent onClose={onClose} />
      </Modal>
    </div>
  )
}

const ModalContent = styled(ModalContentUnstyled)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  width: 'auto',
  ...theme.partials.text.body1,

  '.footer': {
    display: 'flex',
    gap: theme.spacing.medium,
    alignSelf: 'flex-end',
  },

  '*': {
    width: 'auto',
  },
}))

function ModalContentUnstyled({ onClose, ...props }): ReactElement {
  // TODO: wire API calls and validation

  return (
    <div {...props}>
      <span>Are you sure you want to delete this VPN client?</span>

      <div className="footer">
        <Button
          secondary
          onClick={onClose}
        >Cancel
        </Button>
        <Button destructive>Delete</Button>
      </div>
    </div>
  )
}

export { DeleteClient }
