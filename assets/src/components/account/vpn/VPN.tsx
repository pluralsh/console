import { Button, ListBoxItem, Select } from '@pluralsh/design-system'
import styled from 'styled-components'

import { useMemo } from 'react'

import { ScrollablePage } from '../../utils/layout/ScrollablePage'
import VPNClientList from '../../vpn/VPNClientList'
import {
  ColumnActions,
  ColumnAddress,
  ColumnName,
  ColumnPublicKey,
  ColumnStatus,
  ColumnUser,
  VPNClientRow,
} from '../../vpn/columns'

const HeaderActions = styled(HeaderActionsUnstyled)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  gap: theme.spacing.medium,
}))

function HeaderActionsUnstyled({ ...props }) {
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
      <Button secondary>Create VPN client</Button>
    </div>
  )
}

function VPN() {
  const columns = useMemo(() => [ColumnName, ColumnUser, ColumnAddress, ColumnPublicKey, ColumnStatus, ColumnActions], [])
  const data: Array<VPNClientRow> = [{
    name: 'Sebastian Florek',
    address: '127.0.0.1',
    publicKey: '15182j192ghj192j1e9jg91j2d9J(J91jf91j9j1jg91j2349J91jf91j9j1jg91j2349J91jf91j9j1jg91j2349',
    status: 'Running',
    user: {
      id: '123',
      name: 'Sebastian Florek',
      email: 'sebastian@plural.sh',
      profile: '',
    },
  }]

  return (
    <ScrollablePage
      scrollable={false}
      heading="VPN clients"
      headingContent={<HeaderActions />}
    >
      <VPNClientList
        columns={columns}
        data={data}
      />
    </ScrollablePage>
  )
}

export { VPN as AccountVPN }
