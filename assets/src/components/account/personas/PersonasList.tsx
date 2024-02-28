import isEmpty from 'lodash/isEmpty'
import { EmptyState } from '@pluralsh/design-system'
import { useState } from 'react'
import { Div } from 'honorable'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { usePersonasQuery } from 'generated/graphql'

import { extendConnection } from '../../../utils/graphql'
import { ListItem } from '../../utils/List'
import { StandardScroller } from '../../utils/SmoothScroller'

import PersonaCreate from './PersonaCreate'
import Persona from './Persona'

export function PersonasList({ q }: any) {
  const { data, loading, fetchMore } = usePersonasQuery({ variables: { q } })
  const [listRef, setListRef] = useState<any>(null)

  if (!data?.personas) return <LoadingIndicator />

  const { edges, pageInfo } = data.personas

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
          mapper={({ node: persona }, { next }) => (
            <ListItem
              key={persona.id}
              last={!next.node}
            >
              <Persona
                persona={persona}
                q={q}
              />
            </ListItem>
          )}
          loadNextPage={() =>
            pageInfo.hasNextPage &&
            fetchMore({
              variables: { cursor: pageInfo.endCursor },
              updateQuery: (prev, { fetchMoreResult: { personas } }) =>
                extendConnection(prev, personas, 'personas'),
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
              ? "Looks like you don't have any personas yet."
              : `No personas found for ${q}`
          }
        >
          <PersonaCreate q={q} />
        </EmptyState>
      )}
    </Div>
  )
}
