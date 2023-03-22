import {
  Key,
  useCallback,
  useMemo,
  useState,
} from 'react'
import { useQuery } from '@apollo/client'
import BillingLegacyUserBanner from 'components/billing/BillingLegacyUserBanner'
import BillingFeatureBlockBanner from 'components/billing/BillingFeatureBlockBanner'

import { Flex } from 'honorable'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { isEmpty } from 'lodash'

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
import { ResponsivePageFullWidth } from '../../utils/layout/ResponsivePageFullWidth'
import { SHORT_POLL_INTERVAL } from '../../cluster/constants'

import { VPNHeaderActions } from './VPNHeaderActions'

function VPN() {
  const { data: { wireguardPeers } = {}, loading, refetch } = useQuery<Pick<RootQueryType, 'wireguardPeers'>>(WireguardPeers, {
    fetchPolicy: 'network-only',
    pollInterval: SHORT_POLL_INTERVAL,
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

  if (loading) return <LoadingIndicator />

  return (
    <ResponsivePageFullWidth
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
      <Flex
        direction="column"
        height="100%"
      >
        <BillingLegacyUserBanner feature="VPN clients" />
        <VPNClientList
          columns={columns}
          data={filteredClientList}
        />
        <BillingFeatureBlockBanner
          feature="VPN clients"
          planFeature="vpn"
          description="Create and manage VPN clients for a configured WireGuard server."
          placeholderImageURL="/placeholder-vpn.png"
          additionalCondition={isEmpty(clientList)}
        />
      </Flex>
    </ResponsivePageFullWidth>
  )
}

export { VPN as AccountVPN }
