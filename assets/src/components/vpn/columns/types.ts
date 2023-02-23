import { createColumnHelper } from '@tanstack/react-table'

import { User, WireguardPeer } from '../../../generated/graphql'

type VPNClientRow = {
  name?: string
  user?: User
  address?: string
  publicKey?: string
  isReady?: boolean
}

function toVPNClientRow(peer: WireguardPeer | null): VPNClientRow {
  return {
    name: peer?.metadata?.name,
    user: peer?.user ?? undefined,
    isReady: peer?.status?.ready ?? false,
    address: peer?.spec.address ?? undefined,
    publicKey: peer?.spec.publicKey ?? undefined,
  }
}

const ColumnBuilder = createColumnHelper<VPNClientRow>()

export type { VPNClientRow }
export { ColumnBuilder, toVPNClientRow }
