import { EmptyState } from '@pluralsh/design-system'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import isEmpty from 'lodash/isEmpty'
import { useState } from 'react'
import { useTheme } from 'styled-components'

import { extendConnection } from '../../../../utils/graphql'
import { ListItem } from '../../../utils/List'
import { StandardScroller } from '../../../utils/SmoothScroller'

import RoleCreate from './RoleCreate'

import { useRolesQuery } from 'generated/graphql'
import Role from './Role'

export default function RolesList({ q }: any) {
  const theme = useTheme()
  const { data, loading, fetchMore } = useRolesQuery({ variables: { q } })
  const [listRef, setListRef] = useState<any>(null)

  if (!data) return <LoadingIndicator />

  const { edges, pageInfo } = data.roles ?? {}

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        background: theme.colors['fill-zero-selected'],
      }}
    >
      {edges?.length ? (
        <StandardScroller
          listRef={listRef}
          setListRef={setListRef}
          items={edges}
          mapper={({ node: role }) => (
            <ListItem key={role.id}>
              <Role
                role={role}
                q={q}
              />
            </ListItem>
          )}
          loadNextPage={() =>
            pageInfo?.hasNextPage &&
            fetchMore({
              variables: { cursor: pageInfo?.endCursor },
              updateQuery: (prev, { fetchMoreResult: { roles } }) =>
                extendConnection(prev, roles, 'roles'),
            })
          }
          hasNextPage={pageInfo?.hasNextPage}
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
