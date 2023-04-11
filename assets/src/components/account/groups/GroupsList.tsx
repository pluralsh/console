import isEmpty from 'lodash/isEmpty'
import { EmptyState } from '@pluralsh/design-system'
import { useState } from 'react'
import { Div } from 'honorable'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useGroupsQuery } from 'generated/graphql'

import { extendConnection } from '../../../utils/graphql'
import { ListItem } from '../../utils/List'
import { StandardScroller } from '../../utils/SmoothScroller'

import GroupCreate from './GroupCreate'
import Group from './Group'

export function GroupsList({ q }: any) {
  const { data, loading, fetchMore } = useGroupsQuery({ variables: { q } })
  const [listRef, setListRef] = useState<any>(null)

  if (!data?.groups) return <LoadingIndicator />

  const { edges, pageInfo } = data.groups

  return (
    <Div
      flexGrow={1}
      maxHeight="max-content"
    >
      {!isEmpty(edges) ? (
        <StandardScroller
          listRef={listRef}
          setListRef={setListRef}
          items={edges}
          mapper={({ node: group }, { next }) => (
            <ListItem
              key={group.id}
              last={!next.node}
            >
              <Group
                group={group}
                q={q}
              />
            </ListItem>
          )}
          loadNextPage={() =>
            pageInfo.hasNextPage &&
            fetchMore({
              variables: { cursor: pageInfo.endCursor },
              updateQuery: (prev, { fetchMoreResult: { groups } }) =>
                extendConnection(prev, groups, 'groups'),
            })
          }
          hasNextPage={pageInfo.hasNextPage}
          loading={loading}
          placeholder={() => (
            <Div
              flex={false}
              height="50px"
              padding="small"
            />
          )}
          handleScroll={undefined}
          refreshKey={undefined}
          setLoader={undefined}
        />
      ) : (
        <EmptyState
          message={
            isEmpty(q)
              ? "Looks like you don't have any groups yet."
              : `No groups found for ${q}`
          }
        >
          <GroupCreate q={q} />
        </EmptyState>
      )}
    </Div>
  )
}
