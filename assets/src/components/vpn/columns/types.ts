import { createColumnHelper } from '@tanstack/react-table'

import { User } from '../../../generated/graphql'

type VPNClientRow = {
  name?: string
  user?: User
  address?: string
  publicKey?: string
  status?: string
}

const ColumnBuilder = createColumnHelper<VPNClientRow>()

export type { VPNClientRow }
export { ColumnBuilder }
