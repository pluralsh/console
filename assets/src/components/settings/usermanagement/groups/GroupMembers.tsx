import { useState } from 'react'
import { isEmpty } from 'lodash'
import { GroupFragment, useGroupMembersQuery } from 'generated/graphql'

import { extendConnection } from '../../../../utils/graphql'
import { StandardScroller } from '../../../utils/SmoothScroller'
import { List } from '../../../utils/List'

import GroupMember from './GroupMember'

export default function GroupMembers({
  group,
  edit = false,
  skip = false,
}: {
  group: GroupFragment
  edit?: boolean
  skip?: boolean
}) {
  const [listRef, setListRef] = useState<any>(null)
  const { data, loading, fetchMore } = useGroupMembersQuery({
    variables: { id: group.id },
    fetchPolicy: 'network-only',
    skip,
  })

  if (!data?.groupMembers) return null
  const { pageInfo, edges } = data?.groupMembers || {}

  if (isEmpty(edges)) return <>This group has no members.</>

  return (
    <List
      minHeight="230px"
      position="relative"
    >
      <div css={{ flexGrow: 1 }}>
        <StandardScroller
          listRef={listRef}
          setListRef={setListRef}
          items={edges}
          loading={loading}
          placeholder={() => <div css={{ height: '50px', padding: 'small' }} />}
          hasNextPage={pageInfo.hasNextPage}
          mapper={({ node }, { next }) => (
            <GroupMember
              key={node.user.id}
              user={node.user}
              group={group}
              last={!next.node}
              edit={edit}
            />
          )}
          loadNextPage={() =>
            pageInfo.hasNextPage &&
            fetchMore({
              variables: { cursor: pageInfo.endCursor },
              updateQuery: (prev, { fetchMoreResult: { groupMembers } }) =>
                extendConnection(prev, groupMembers, 'groupMembers'),
            })
          }
          handleScroll={undefined}
          refreshKey={undefined}
          setLoader={undefined}
        />
      </div>
    </List>
  )
}
