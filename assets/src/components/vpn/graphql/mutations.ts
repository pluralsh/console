import { gql } from 'apollo-boost'

import { WireguardPeerListFragment } from './fragments'

const CreateWireguardPeer = gql`
  mutation CreateWireguardPeer($email: String, $name: String!, $userId: ID) {
    createPeer(email: $email, name: $name, userId: $userId) {
      ...WireguardPeerListFragment
    }
  }
  ${WireguardPeerListFragment}
`

const DeleteWireguardPeer = gql`
  mutation DeleteWireguardPeer($name: String!) {
    deletePeer(name: $name) {
      ...WireguardPeerListFragment
    }
  }
  ${WireguardPeerListFragment}
`

export { CreateWireguardPeer, DeleteWireguardPeer }
