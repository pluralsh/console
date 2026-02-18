import { Button, Input, SearchIcon, Table } from '@pluralsh/design-system'
import { useGroupsQuery } from 'generated/graphql'
import { useContext, useMemo, useState } from 'react'

import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'

import { GqlError } from 'components/utils/Alert'

import { LoginContext } from 'components/contexts'

import { Permissions, hasRbac } from '../misc'

import { useThrottle } from 'components/hooks/useThrottle'
import { SimpleToastChip } from 'components/utils/SimpleToastChip'
import { Body2BoldP } from 'components/utils/typography/Text'
import { mapExistingNodes } from 'utils/graphql'
import { ListWrapperSC } from '../users/UsersList'
import { GROUP_CREATE_ID_KEY, GroupEditT } from './Groups'
import { groupsCols } from './GroupsColumns'

export type GroupsListMeta = {
  editable: boolean
  setGroupEdit: (group: Nullable<GroupEditT>) => void
  setGroupDeletedToast: (show: boolean, groupName: string) => void
}

export function GroupsList({
  setGroupEdit,
}: {
  setGroupEdit: (group: Nullable<GroupEditT>) => void
}) {
  const { me } = useContext(LoginContext)

  const [showGroupDeletedToast, setShowGroupDeletedToast] = useState<{
    show: boolean
    groupName: string
  }>({ show: false, groupName: '' })

  const [q, setQ] = useState('')
  const throttledQ = useThrottle(q, 300)

  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useGroupsQuery, keyPath: ['groups'] },
      { q: throttledQ }
    )
  const groups = useMemo(() => mapExistingNodes(data?.groups), [data?.groups])

  const meta: GroupsListMeta = {
    editable: !!me?.roles?.admin || hasRbac(me, Permissions.USERS),
    setGroupDeletedToast: (show, groupName) =>
      setShowGroupDeletedToast({ show, groupName }),
    setGroupEdit,
  }

  if (error) return <GqlError error={error} />
  return (
    <ListWrapperSC>
      <Input
        value={q}
        placeholder="Search groups"
        startIcon={<SearchIcon color="text-light" />}
        onChange={({ target: { value } }) => setQ(value)}
        background="fill-zero"
        flexShrink={0}
      />
      <Table
        hideHeader
        fullHeightWrap
        virtualizeRows
        rowBg="base"
        data={groups}
        loading={!data && loading}
        columns={groupsCols}
        reactTableOptions={{ meta }}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        emptyStateProps={{
          ...(!throttledQ
            ? {
                message: "Looks like you don't have any groups yet.",
                children: (
                  <Button
                    floating
                    onClick={() => setGroupEdit(GROUP_CREATE_ID_KEY)}
                  >
                    Create group
                  </Button>
                ),
              }
            : { message: `No groups found for ${throttledQ}` }),
        }}
      />
      <SimpleToastChip
        show={showGroupDeletedToast.show}
        delayTimeout={2500}
        onClose={() => setShowGroupDeletedToast({ show: false, groupName: '' })}
      >
        {showGroupDeletedToast.groupName}
        <Body2BoldP $color="icon-danger">deleted</Body2BoldP>
      </SimpleToastChip>
    </ListWrapperSC>
  )
}
