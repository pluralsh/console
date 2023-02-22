import {
  Button,
  ListBoxItem,
  LoopingLogo,
  Select,
} from '@pluralsh/design-system'
import styled from 'styled-components'
import { useMemo, useState } from 'react'
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
import { CreateClient } from '../../vpn/actions/Create'
import { RootQueryType } from '../../../generated/graphql'
import { WireguardPeers } from '../../vpn/graphql/queries'

const HeaderActions = styled(HeaderActionsUnstyled)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  gap: theme.spacing.medium,
}))

function HeaderActionsUnstyled({ ...props }) {
  const [open, setOpen] = useState(false)

  return (
    <div {...props}>
      <Select
        label="All users"
        selectedKey={null}
      >
        <ListBoxItem
          key="test"
          label="test"
        />
      </Select>
      <Button
        secondary
        onClick={() => setOpen(true)}
      >Create VPN client
      </Button>

      {/* Modals */}
      {open && (
        <CreateClient
          onClose={() => setOpen(false)}
          refetch={() => {}}
        />
      )}
    </div>
  )
}

const MOCK_CLIENT_LIST = [{
  name: 'sebastian-vpn-test',
  address: '127.0.0.1',
  publicKey: '15182j192ghj192j1e9jg91j2d9J(J91jf91j9j1jg91j2349J91jf91j9j1jg91j2349J91jf91j9j1jg91j2349',
  isReady: false,
  user: {
    id: '123',
    name: 'Sebastian Florek',
    email: 'sebastian@plural.sh',
    profile: '',
  },
}]

function VPN() {
  const { data: { wireguardPeers } = {}, loading, refetch } = useQuery<Pick<RootQueryType, 'wireguardPeers'>>(WireguardPeers)
  const columns = useMemo(() => [ColumnName, ColumnUser, ColumnAddress, ColumnPublicKey, ColumnStatus, ColumnActions(refetch)], [refetch])
  const clientList = useMemo(() => wireguardPeers?.map(peer => toVPNClientRow(peer)) ?? [], [wireguardPeers])

  console.log(wireguardPeers)

  if (loading) {
    return <LoopingLogo />
  }

  return (
    <ScrollablePage
      scrollable={false}
      heading="VPN clients"
      headingContent={<HeaderActions />}
    >
      <VPNClientList
        columns={columns}
        data={clientList.concat(MOCK_CLIENT_LIST)}
      />
    </ScrollablePage>
  )
}

export { VPN as AccountVPN }
