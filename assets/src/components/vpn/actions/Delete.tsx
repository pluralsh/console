import styled from 'styled-components'
import { Dispatch, ReactElement } from 'react'
import { Button, GraphQLToast, Modal } from '@pluralsh/design-system'
import { ServerError, useMutation } from '@apollo/client'

import { RootMutationTypeDeletePeerArgs, WireguardPeer } from '../../../generated/graphql'
import { DeleteWireguardPeer } from '../graphql/mutations'

interface DeleteClientProps {
  name: string
  refetch: Dispatch<void>
  onClose: Dispatch<void>
}

const DeleteClient = styled(DeleteClientUnstyled)(() => ({
  '.modalContainer': {
    padding: 0,

    // This is to fix modal width when truncated table row applies 100% width to all children.
    '& > div': {
      width: 'auto',
    },
  },
}))

function DeleteClientUnstyled({
  name, onClose, refetch, ...props
}: DeleteClientProps): ReactElement {
  return (
    <div {...props}>
      <Modal
        BackdropProps={{ zIndex: 20 }}
        header="delete vpn client"
        open
        onClose={onClose}
        size="large"
        className="modalContainer"
      >
        <ModalContent
          onClose={onClose}
          refetch={refetch}
          name={name}
        />
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

function ModalContentUnstyled({
  name, onClose, refetch, ...props
}: DeleteClientProps): ReactElement {
  const [deletePeer, { loading, error }] = useMutation<WireguardPeer, RootMutationTypeDeletePeerArgs>(DeleteWireguardPeer, {
    variables: {
      name,
    },
    onCompleted: () => {
      refetch()
      onClose()
    },
  })

  return (
    <div {...props}>
      <span>Are you sure you want to delete this VPN client?</span>

      <div className="footer">
        <Button
          secondary
          onClick={onClose}
        >Cancel
        </Button>
        <Button
          destructive
          onClick={deletePeer}
          loading={loading}
        >Delete
        </Button>
      </div>

      {error && (
        <GraphQLToast
          header={(error?.networkError as ServerError)?.statusCode?.toString() ?? 'Error'}
          error={{ graphQLErrors: [...error?.graphQLErrors ?? []] }}
          margin="medium"
          marginHorizontal="xxxxlarge"
        />
      )}
    </div>
  )
}

export { DeleteClient }
