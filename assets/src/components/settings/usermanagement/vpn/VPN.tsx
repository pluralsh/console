import { useQuery } from '@apollo/client'
import BillingFeatureBlockBanner from 'components/billing/BillingFeatureBlockBanner'
import BillingLegacyUserBanner from 'components/billing/BillingLegacyUserBanner'
import { Key, useCallback, useContext, useMemo, useState } from 'react'

import { Flex } from 'honorable'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { isEmpty } from 'lodash'

import SubscriptionContext from 'components/contexts/SubscriptionContext'

import { useSetBreadcrumbs } from '@pluralsh/design-system'

import { RootQueryType, User } from '../../../../generated/graphql'
import { ResponsivePageFullWidth } from '../../../utils/layout/ResponsivePageFullWidth'
import VPNClientList from '../../../vpn/VPNClientList'
import {
  ColumnActions,
  ColumnAddress,
  ColumnName,
  ColumnPublicKey,
  ColumnStatus,
  ColumnUser,
  toVPNClientRow,
} from '../../../vpn/columns'
import { WireguardPeers } from '../../../vpn/graphql/queries'

import { getUserManagementBreadcrumbs } from '../UserManagement'

import { VPNHeaderActions } from './VPNHeaderActions'

const SHORT_POLL_INTERVAL = 3 * 1000

const breadcrumbs = getUserManagementBreadcrumbs('vpn')

function VPN() {
  useSetBreadcrumbs(breadcrumbs)

  const {
    data: { wireguardPeers } = {},
    loading,
    refetch,
  } = useQuery<Pick<RootQueryType, 'wireguardPeers'>>(WireguardPeers, {
    fetchPolicy: 'network-only',
    pollInterval: SHORT_POLL_INTERVAL,
  })
  const [selectedUsers, setSelectedUsers] = useState<Set<Key>>(new Set<Key>())
  const columns = useMemo(
    () => [
      ColumnName,
      ColumnUser,
      ColumnAddress,
      ColumnPublicKey,
      ColumnStatus,
      ColumnActions(refetch),
    ],
    [refetch]
  )
  const clientList = useMemo(
    () => wireguardPeers?.map((peer) => toVPNClientRow(peer)) ?? [],
    [wireguardPeers]
  )
  const users = useMemo(
    () =>
      Array.from(
        clientList
          .reduce((map, row) => {
            if (!row?.user) return map
            if (!map.has(row.user.id)) map.set(row.user.id, row.user)

            return map
          }, new Map<string, User>())
          .values()
      ),
    [clientList]
  )
  const filteredClientList = useMemo(
    () =>
      selectedUsers.size === 0
        ? clientList
        : clientList.filter((client) =>
            selectedUsers.has(client.user?.id ?? '')
          ),
    [selectedUsers, clientList]
  )
  const onFilter = useCallback(
    (selectedUsers) => setSelectedUsers(selectedUsers),
    []
  )
  const { availableFeatures } = useContext(SubscriptionContext)
  const isAvailable = !!availableFeatures?.vpn || !isEmpty(clientList)

  if (loading) return <LoadingIndicator />

  return (
    <ResponsivePageFullWidth
      scrollable={false}
      heading="VPN clients"
      headingContent={
        <VPNHeaderActions
          refetch={refetch}
          users={users}
          onFilter={onFilter}
        />
      }
    >
      <Flex
        direction="column"
        height="100%"
      >
        <BillingLegacyUserBanner feature="VPN clients" />
        {isAvailable ? (
          <VPNClientList
            columns={columns}
            data={filteredClientList}
          />
        ) : (
          <BillingFeatureBlockBanner
            feature="VPN clients"
            description="Create and manage VPN clients for a configured WireGuard server."
            placeholderImageURL="/placeholder-vpn.png"
          />
        )}
      </Flex>
    </ResponsivePageFullWidth>
  )
}

export { VPN as AccountVPN }
