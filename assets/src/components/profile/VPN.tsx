import { useMemo } from 'react'

import { ScrollablePage } from '../utils/layout/ScrollablePage'
import VPNClientList from '../vpn/VPNClientList'
import {
  ColumnAddress,
  ColumnDelete,
  ColumnDownload,
  ColumnName,
  ColumnPublicKey,
  ColumnStatus,
  VPNClientRow,
} from '../vpn/columns'

function VPN() {
  const columns = useMemo(() => [ColumnName, ColumnAddress, ColumnPublicKey, ColumnStatus, ColumnDownload, ColumnDelete], [])
  const fdata: Array<VPNClientRow> = [{
    name: 'Sebastian Florek',
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
