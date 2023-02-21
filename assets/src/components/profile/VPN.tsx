import { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'

import { useQuery } from '@apollo/client'

import { ScrollablePage } from '../utils/layout/ScrollablePage'
import VPNClientList from '../vpn/VPNClientList'
import {
  ColumnAddress,
  ColumnDelete,
  ColumnDownload,
  ColumnName,
  ColumnPublicKey,
  VPNClientRow,
} from '../vpn/columns'
import { MY_WIREGUARD_PEERS } from '../vpn/queries'

function VPN() {
  const columns = useMemo(() => [ColumnName, ColumnAddress, ColumnPublicKey, ColumnDownload, ColumnDelete], [])
  const { data, error } = useQuery(MY_WIREGUARD_PEERS)

  console.log(data)
  console.log(error)
  const fdata: Array<VPNClientRow> = [{
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
    >
      <VPNClientList
        columns={columns}
        data={fdata}
      />
    </ScrollablePage>
  )
}

export { VPN as ProfileVPN }
