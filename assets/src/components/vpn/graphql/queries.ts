import { gql } from 'apollo-boost'

import { WireguardPeerFragment, WireguardPeerListFragment } from './fragments'

const MyWireguardPeers = gql`
  query MyWireguardPeers {
    myWireguardPeers {
      ...WireguardPeerListFragment
    }
  }
  ${WireguardPeerListFragment}
`

const WireguardPeers = gql`
  query WireguardPeers {
    wireguardPeers {
      ...WireguardPeerListFragment
    }
  }
  ${WireguardPeerListFragment}
`

const WireguardPeer = gql`
  query WireguardPeer($name: String!) {
    wireguardPeer(name: $name) {
      ...WireguardPeerFragment
    }
  }
  ${WireguardPeerFragment}
`

export { MyWireguardPeers, WireguardPeers, WireguardPeer }
