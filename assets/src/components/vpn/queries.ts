import { gql } from 'apollo-boost'

const WireguardPeerFragment = gql`
  fragment WireguardPeerFragment on WireguardPeer {
    config
    metadata {
      name
    }
    status {
      ready
    }
    user {
      name
      email
      profile
    }
  }
`

const MyWireguardPeers = gql`
  query MyWireguardPeers {
    myWireguardPeers {
      ...WireguardPeerFragment
    }
  }
  ${WireguardPeerFragment}
`

const WireguardPeers = gql`
  query WireguardPeers {
    wireguardPeers {
      ...WireguardPeerFragment
    }
    ${WireguardPeerFragment}
  }
`

export { MyWireguardPeers, WireguardPeers }
