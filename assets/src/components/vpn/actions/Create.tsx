import styled from 'styled-components'
import { ReactElement } from 'react'
import {
  Button,
  FormField,
  Input,
  Modal,
} from '@pluralsh/design-system'

function CreateClient({ onClose }): ReactElement {
  return (
    <Modal
      header="create vpn client"
      open
      onClose={onClose}
      size="large"
      style={{ padding: 0 }}
    >
      <ModalContent onClose={onClose} />
    </Modal>
  )
}

const ModalContent = styled(ModalContentUnstyled)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,

  '.footer': {
    display: 'flex',
    gap: theme.spacing.medium,
    alignSelf: 'flex-end',
  },
}))

function ModalContentUnstyled({ onClose, ...props }): ReactElement {
  // TODO: wire API calls and validation

  return (
    <div {...props}>
      <FormField label="Name">
        <Input placeholder="VPN client name" />
      </FormField>

      <FormField label="User email">
        <Input placeholder="Enter user email" />
      </FormField>

      <div className="footer">
        <Button
          secondary
          onClick={onClose}
        >Cancel
        </Button>
        <Button>Create</Button>
      </div>
    </div>
  )
}

export { CreateClient }
