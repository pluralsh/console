import { useQuery } from '@apollo/client'
import { Box } from 'grommet'
import isEmpty from 'lodash/isEmpty'
import { Div } from 'honorable'
import { EmptyState } from '@pluralsh/design-system'
import { useState } from 'react'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { ListItem } from '../../utils/List'
import { extendConnection } from '../../../utils/graphql'
import { StandardScroller } from '../../utils/SmoothScroller'
import RoleCreate from '../roles/RoleCreate'

import { ROLES_Q } from './queries'
import Role from './Role'

export default function RolesList({ q }: any) {
  const [listRef, setListRef] = useState<any>(null)
  const { data, loading, fetchMore } = useQuery(ROLES_Q, { variables: { q } })

  if (!data) return <LoadingIndicator />

  const { edges, pageInfo } = data.roles

  return (
    <Box
      fill
      pad={{ bottom: 'small' }}
    >
      {edges?.length ? (
        <StandardScroller
          listRef={listRef}
          setListRef={setListRef}
          items={edges}
          mapper={({ node: role }, { next }) => (
            <ListItem last={!next.node}>
              <Role
                role={role}
                q={q}
              />
            </ListItem>
          )}
          loadNextPage={() => pageInfo.hasNextPage
            && fetchMore({
              variables: { cursor: pageInfo.endCursor },
              updateQuery: (prev, { fetchMoreResult: { roles } }) => extendConnection(prev, roles, 'roles'),
            })}
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
              ? "Looks like you don't have any roles yet."
              : `No roles found for ${q}`
          }
        >
          <RoleCreate q={q} />
        </EmptyState>
      )}
    </Box>
  )
}
