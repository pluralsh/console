import { createColumnHelper } from '@tanstack/react-table'

import { User } from '../../../generated/graphql'

type VPNClientRow = {
  name?: string
  user?: User
  address?: string
  publicKey?: string
  isReady?: boolean
}

const ColumnBuilder = createColumnHelper<VPNClientRow>()

export type { VPNClientRow }
export { ColumnBuilder }
