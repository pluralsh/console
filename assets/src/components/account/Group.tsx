import { useMutation, useQuery } from '@apollo/client'
import { Box } from 'grommet'
import { IconFrame, TrashCanIcon } from '@pluralsh/design-system'
import { useState } from 'react'
import { Div } from 'honorable'

import { extendConnection } from '../../utils/graphql'

import { StandardScroller } from '../utils/SmoothScroller'

import { List, ListItem } from '../utils/List'

import { DELETE_GROUP_MEMBER, GROUP_MEMBERS } from './queries'

import { UserInfo } from './User'

function GroupMember({
  user, group, first, last, edit,
}: any) {
  const [mutation] = useMutation(DELETE_GROUP_MEMBER, {
    variables: { groupId: group.id, userId: user.id },
    refetchQueries: [{ query: GROUP_MEMBERS, variables: { id: group.id } }],
  })

  return (
    <ListItem
      flex={false}
      background="fill-two"
      first={first}
      last={last}
    >
      <Box
        flex={false}
        fill="horizontal"
        direction="row"
        align="center"
      >
        <UserInfo
          user={user}
          fill="horizontal"
          hue="lightest"
        />
        {edit && (
          <IconFrame
            size="medium"
            clickable
            icon={<TrashCanIcon color="icon-danger" />}
            textValue="Delete"
            onClick={() => mutation()}
            hue="lighter"
          />
        )}
      </Box>
    </ListItem>
  )
}

export function GroupMembers({ group, edit }: any) {
  const [listRef, setListRef] = useState<any>(null)
  const { data, loading, fetchMore } = useQuery(GROUP_MEMBERS, {
    variables: { id: group.id },
    fetchPolicy: 'network-only',
  })

  if (!data) return null
  const {
    groupMembers: { pageInfo, edges },
  } = data

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

export function ViewGroup({ group }: any) {
  return (
    <Box
      fill
      pad={{ bottom: 'small' }}
      gap="small"
    >
      <GroupMembers group={group} />
    </Box>
  )
}
