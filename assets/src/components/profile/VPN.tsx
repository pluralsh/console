import { useMemo } from 'react'
import { useQuery } from '@apollo/client'
import LoadingIndicator from 'components/utils/LoadingIndicator'

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
import { ResponsivePageFullWidth } from '../utils/layout/ResponsivePageFullWidth'

function VPN() {
  const { data: { myWireguardPeers } = {}, loading, refetch } = useQuery<Pick<RootQueryType, 'myWireguardPeers'>>(MyWireguardPeers, {
    fetchPolicy: 'network-only',
  })
  const columns = useMemo(() => [ColumnName, ColumnAddress, ColumnPublicKey, ColumnStatus, ColumnDownload, ColumnDelete(refetch)], [refetch])
  const clientList = useMemo(() => myWireguardPeers?.map(peer => toVPNClientRow(peer)) ?? [], [myWireguardPeers])

  if (loading) return <LoadingIndicator />

  return (
    <ResponsivePageFullWidth
      scrollable={false}
      heading="VPN clients"
    >
      <VPNClientList
        columns={columns}
        data={clientList}
      />
    </ResponsivePageFullWidth>
  )
}

export { VPN as ProfileVPN }
