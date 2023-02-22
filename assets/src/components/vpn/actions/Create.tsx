import styled from 'styled-components'
import { Dispatch, ReactElement, useState } from 'react'
import {
  Button,
  FormField,
  Input,
  Modal,
} from '@pluralsh/design-system'
import { useMutation } from '@apollo/client'

import { CreateWireguardPeer } from '../graphql/mutations'
import { RootMutationTypeCreatePeerArgs, WireguardPeer } from '../../../generated/graphql'

interface CreateClientProps {
  refetch: Dispatch<void>
  onClose: Dispatch<void>
}

function CreateClient({ onClose, refetch }: CreateClientProps): ReactElement {
  return (
    <Modal
      header="create vpn client"
      open
      onClose={onClose}
      size="large"
      style={{ padding: 0 }}
    >
      <ModalContent
        onClose={onClose}
        refetch={refetch}
      />
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

function ModalContentUnstyled({ onClose, refetch, ...props }: CreateClientProps): ReactElement {
  const [name, setName] = useState<string>('')
  const [email, setEmail] = useState<string>()
  const [createPeer, { loading, error }] = useMutation<WireguardPeer, RootMutationTypeCreatePeerArgs>(CreateWireguardPeer, {
    variables: {
      name,
      email,
    },
    onCompleted: () => {
      refetch()
      onClose()
    },
  })

  console.log(error)

  return (
    <div {...props}>
      <FormField
        label="Name"
        required
      >
        <Input
          placeholder="VPN client name"
          value={name}
          onChange={({ target: { value } }) => setName(value)}
        />
      </FormField>

      <FormField
        label="User email"
        required
      >
        <Input
          placeholder="Enter user email"
          value={email}
          onChange={({ target: { value } }) => setEmail(value)}
        />
      </FormField>

      <div className="footer">
        <Button
          secondary
          onClick={onClose}
        >Cancel
        </Button>
        <Button
          loading={loading}
          onClick={createPeer}
        >Create
        </Button>
      </div>
    </div>
  )
}

export { CreateClient }
