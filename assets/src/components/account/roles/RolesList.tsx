import isEmpty from 'lodash/isEmpty'
import { EmptyState } from '@pluralsh/design-system'
import { useState } from 'react'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useQuery } from '@apollo/client'
import { useTheme } from 'styled-components'

import { ListItem } from '../../utils/List'
import { extendConnection } from '../../../utils/graphql'
import { StandardScroller } from '../../utils/SmoothScroller'
import RoleCreate from '../roles/RoleCreate'

import Role from './Role'
import { ROLES_Q } from './queries'

export default function RolesList({ q }: any) {
  const theme = useTheme()
  const { data, loading, fetchMore } = useQuery(ROLES_Q, { variables: { q } })
  const [listRef, setListRef] = useState<any>(null)

  if (!data) return <LoadingIndicator />

  const { edges, pageInfo } = data.roles

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
      }}
    >
      {edges?.length ? (
        <StandardScroller
          listRef={listRef}
          setListRef={setListRef}
          items={edges}
          mapper={({ node: role }, { next }) => (
            <ListItem
              key={role.id}
              last={!next.node}
            >
              <Role
                role={role}
                q={q}
              />
            </ListItem>
          )}
          loadNextPage={() =>
            pageInfo.hasNextPage &&
            fetchMore({
              variables: { cursor: pageInfo.endCursor },
              updateQuery: (prev, { fetchMoreResult: { roles } }) =>
                extendConnection(prev, roles, 'roles'),
            })
          }
          hasNextPage={pageInfo.hasNextPage}
          loading={loading}
          placeholder={() => (
            <div css={{ padding: theme.spacing.small, height: 50 }} />
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
    </div>
  )
}
