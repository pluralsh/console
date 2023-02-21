import { gql } from 'apollo-boost'

export const MY_WIREGUARD_PEERS = gql`
query MyWireguardPeers {
  myWireguardPeers {
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
}
`
