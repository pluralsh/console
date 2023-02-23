import { gql } from 'apollo-boost'

const WireguardPeerListFragment = gql`
  fragment WireguardPeerListFragment on WireguardPeer {
    metadata {
      name
    }
    status {
      ready
    }
    user {
      id
      name
      email
      profile
    }
    spec {
      address
      publicKey
    }
  }
`

const WireguardPeerFragment = gql`
  fragment WireguardPeerFragment on WireguardPeer {
    config
  }
`

export { WireguardPeerFragment, WireguardPeerListFragment }
