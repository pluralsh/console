import { useMemo } from 'react'
import { useQuery } from '@apollo/client'

import { ScrollablePage } from '../utils/layout/ScrollablePage'
import VPNClientList from '../vpn/VPNClientList'
import {
  ColumnAddress,
  ColumnDelete,
  ColumnDownload,
  ColumnName,
  ColumnPublicKey,
  ColumnStatus,
  toVPNClientRow,
} from '../vpn/columns'
import { MyWireguardPeers } from '../vpn/graphql/queries'
import { RootQueryType } from '../../generated/graphql'

const MOCK_CLIENT_LIST = [{
  name: 'sebastian-vpn-test',
  address: '127.0.0.1',
  publicKey: '15182j192ghj192j1e9jg91j2d9J(J91jf91j9j1jg91j2349J91jf91j9j1jg91j2349J91jf91j9j1jg91j2349',
  isReady: true,
  user: {
    id: '123',
    name: 'Sebastian Florek',
    email: 'sebastian@plural.sh',
    profile: '',
  },
}]

function VPN() {
  const columns = useMemo(() => [ColumnName, ColumnAddress, ColumnPublicKey, ColumnStatus, ColumnDownload, ColumnDelete], [])
  const { data: { myWireguardPeers } = {}, error } = useQuery<Pick<RootQueryType, 'myWireguardPeers'>>(MyWireguardPeers)
  const clientList = useMemo(() => myWireguardPeers?.map(peer => toVPNClientRow(peer)) ?? [], [myWireguardPeers])

  return (
    <ScrollablePage
      scrollable={false}
      heading="VPN clients"
    >
      <VPNClientList
        columns={columns}
        data={clientList.concat(MOCK_CLIENT_LIST)}
      />
    </ScrollablePage>
  )
}

export { VPN as ProfileVPN }
