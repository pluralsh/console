import { LoopingLogo } from '@pluralsh/design-system'
import {
  Key,
  useCallback,
  useMemo,
  useState,
} from 'react'
import { useQuery } from '@apollo/client'

import { ScrollablePage } from '../../utils/layout/ScrollablePage'
import VPNClientList from '../../vpn/VPNClientList'
import {
  ColumnActions,
  ColumnAddress,
  ColumnName,
  ColumnPublicKey,
  ColumnStatus,
  ColumnUser,
  toVPNClientRow,
} from '../../vpn/columns'
import { RootQueryType, User } from '../../../generated/graphql'
import { WireguardPeers } from '../../vpn/graphql/queries'

import { VPNHeaderActions } from './VPNHeaderActions'

function VPN() {
  const { data: { wireguardPeers } = {}, loading, refetch } = useQuery<Pick<RootQueryType, 'wireguardPeers'>>(WireguardPeers, {
    fetchPolicy: 'network-only',
  })
  const [selectedUsers, setSelectedUsers] = useState<Set<Key>>(new Set<Key>())
  const columns = useMemo(() => [ColumnName, ColumnUser, ColumnAddress, ColumnPublicKey, ColumnStatus, ColumnActions(refetch)], [refetch])
  const clientList = useMemo(() => wireguardPeers?.map(peer => toVPNClientRow(peer)) ?? [], [wireguardPeers])
  const users = useMemo(() => Array.from(clientList.reduce((map, row) => {
    if (!row?.user) return map
    if (!map.has(row.user.id)) map.set(row.user.id, row.user)

    return map
  }, new Map<string, User>()).values()), [clientList])
  const filteredClientList = useMemo(() => (selectedUsers.size === 0
    ? clientList
    : clientList.filter(client => selectedUsers.has(client.user?.id ?? ''))), [selectedUsers, clientList])
  const onFilter = useCallback(selectedUsers => setSelectedUsers(selectedUsers), [])

  if (loading) {
    return <LoopingLogo />
  }

  return (
    <ScrollablePage
      scrollable={false}
      heading="VPN clients"
      headingContent={(
        <VPNHeaderActions
          refetch={refetch}
          users={users}
          onFilter={onFilter}
        />
      )}
    >
      <VPNClientList
        columns={columns}
        data={filteredClientList}
      />
    </ScrollablePage>
  )
}

export { VPN as AccountVPN }
