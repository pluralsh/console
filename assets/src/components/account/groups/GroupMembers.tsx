import { useQuery } from '@apollo/client'

import { useState } from 'react'
import { Div } from 'honorable'

import { isEmpty } from 'lodash'

import { extendConnection } from '../../../utils/graphql'

import { StandardScroller } from '../../utils/SmoothScroller'

import { List } from '../../utils/List'

import { GROUP_MEMBERS } from './queries'

import GroupMember from './GroupMember'

export default function GroupMembers({ group, edit = false }: any) {
  const [listRef, setListRef] = useState<any>(null)
  const { data, loading, fetchMore } = useQuery(GROUP_MEMBERS, {
    variables: { id: group.id },
    fetchPolicy: 'network-only',
  })

  if (!data) return null
  const {
    groupMembers: { pageInfo, edges },
  } = data

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
          mapper={({ node }, { prev, next }) => (
            <GroupMember
              key={node.user.id}
              user={node.user}
              group={group}
              first={!prev.node}
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
