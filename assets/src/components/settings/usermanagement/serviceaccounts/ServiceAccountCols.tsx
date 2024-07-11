import { UserType } from '@pluralsh/design-system/dist/types'
import { createColumnHelper } from '@tanstack/react-table'
import UserInfo from 'components/utils/UserInfo'

const columnHelper = createColumnHelper<UserType>()
const ColInfo = columnHelper.accessor((user) => user, {
  id: 'info',
  cell: function Cell({ getValue }) {
    return <UserInfo user={getValue()} />
  },
})

export const serviceAccountsCols = [ColInfo]
