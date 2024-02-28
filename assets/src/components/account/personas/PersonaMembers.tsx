import { useState } from 'react'
import { Div } from 'honorable'
import { isEmpty } from 'lodash'
import { usePersonaMembersQuery } from 'generated/graphql'

import { extendConnection } from '../../../utils/graphql'
import { StandardScroller } from '../../utils/SmoothScroller'
import { List } from '../../utils/List'

import PersonaMember from './PersonaMember'

export default function PersonaMembers({ persona, edit = false }: any) {
  const [listRef, setListRef] = useState<any>(null)
  const { data, loading, fetchMore } = usePersonaMembersQuery({
    variables: { id: persona.id },
    fetchPolicy: 'network-only',
  })

  if (!data?.personaMembers) return null
  const { pageInfo, edges } = data?.personaMembers || {}

  if (isEmpty(edges)) return <>This persona has no members.</>

  return (
    <List
      minHeight="230px"
      position="relative"
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
            <PersonaMember
              key={node.user.id}
              user={node.user}
              persona={persona}
              last={!next.node}
              edit={edit}
            />
          )}
          loadNextPage={() =>
            pageInfo.hasNextPage &&
            fetchMore({
              variables: { cursor: pageInfo.endCursor },
              updateQuery: (prev, { fetchMoreResult: { personaMembers } }) =>
                extendConnection(prev, personaMembers, 'personaMembers'),
            })
          }
          handleScroll={undefined}
          refreshKey={undefined}
          setLoader={undefined}
        />
      </Div>
    </List>
  )
}
