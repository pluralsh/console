import { useState } from 'react'
import { Div } from 'honorable'
import { isEmpty } from 'lodash'
import { useGroupMembersQuery } from 'generated/graphql'

import { extendConnection } from '../../../utils/graphql'
import { StandardScroller } from '../../utils/SmoothScroller'
import { List } from '../../utils/List'

import GroupMember from './GroupMember'

export default function GroupMembers({ group, edit = false }: any) {
  const [listRef, setListRef] = useState<any>(null)
  const { data, loading, fetchMore } = useGroupMembersQuery({
    variables: { id: group.id },
    fetchPolicy: 'network-only',
  })

  if (!data?.groupMembers) return null
  const { pageInfo, edges } = data?.groupMembers || {}

  if (isEmpty(edges)) return <>This group has no members.</>

  return (
    <List
      minHeight="230px"
      position="relative"
      hue="lighter"
    >
      <Div flexGrow="1">
        <StandardScroller
          listRef={listRef}
          setListRef={setListRef}
          items={edges}
          loading={loading}
          placeholder={() => (
            <Div
              flex={false}
              height="50px"
              padding="small"
            />
          )}
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
          loadNextPage={() => pageInfo.hasNextPage
            && fetchMore({
              variables: { cursor: pageInfo.endCursor },
              updateQuery: (prev, { fetchMoreResult: { groupMembers } }) => extendConnection(prev, groupMembers, 'groupMembers'),
            })}
          handleScroll={undefined}
          refreshKey={undefined}
          setLoader={undefined}
        />
      </Div>
    </List>
  )
}
