import { createColumnHelper } from '@tanstack/react-table'
import { User as UserType } from 'generated/graphql'

import { User } from './User'

const columnHelper = createColumnHelper<UserType>()
const ColUser = columnHelper.accessor((user) => user, {
  id: 'user',
  cell: function Cell({ getValue }) {
    return <User user={getValue()} />
  },
})

export const usersCols = [ColUser]
