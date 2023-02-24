import { gql } from 'apollo-boost'

const CreateWireguardPeer = gql`
  mutation CreateWireguardPeer($email: String, $name: String!, $userId: ID) {
    createPeer(email: $email, name: $name, userId: $userId) {
      raw
    }
  }
`

const DeleteWireguardPeer = gql`
  mutation DeleteWireguardPeer($name: String!) {
    deletePeer(name: $name)
  }
`

export { CreateWireguardPeer, DeleteWireguardPeer }
