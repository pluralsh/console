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
import { LoopingLogo } from '../../../../../design-system/src'

function VPN() {
  const { data: { myWireguardPeers } = {}, loading, refetch } = useQuery<Pick<RootQueryType, 'myWireguardPeers'>>(MyWireguardPeers)
  const columns = useMemo(() => [ColumnName, ColumnAddress, ColumnPublicKey, ColumnStatus, ColumnDownload, ColumnDelete(refetch)], [])
  const clientList = useMemo(() => myWireguardPeers?.map(peer => toVPNClientRow(peer)) ?? [], [myWireguardPeers])

  if (loading) {
    return <LoopingLogo />
  }

  return (
    <ScrollablePage
      scrollable={false}
      heading="VPN clients"
    >
      <VPNClientList
        columns={columns}
        data={clientList}
      />
    </ScrollablePage>
  )
}

export { VPN as ProfileVPN }
