import { ComponentProps, useMemo, useRef } from 'react'
import { EmptyState, TabPanel, Table } from '@pluralsh/design-system'
import { useNavigate } from 'react-router'
import { useTheme } from 'styled-components'
import type { Row } from '@tanstack/react-table'
import isEmpty from 'lodash/isEmpty'
import { Namespace, useNamespacesQuery } from 'generated/graphql'
import { getNamespacesDetailsPath } from 'routes/cdRoutesConsts'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { GqlError } from 'components/utils/Alert'

import { NAMESPACES_REACT_VIRTUAL_OPTIONS, columns } from './Namespaces'

export function NamespacesTable() {
  const theme = useTheme()
  const navigate = useNavigate()
  const tabStateRef = useRef<any>(null)

  const queryResult = useNamespacesQuery({
    fetchPolicy: 'cache-and-network',
    // Important so loading will be updated on fetchMore to send to Table
    notifyOnNetworkStatusChange: true,
  })
  const { error, loading, data: currentData, previousData } = queryResult
  const data = currentData || previousData

  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] =
    useMemo(
      () => ({
        meta: {},
      }),
      []
    )

  if (error) {
    return <GqlError error={error} />
  }
  if (!data) {
    return <LoadingIndicator />
  }

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        height: '100%',
      }}
    >
      <TabPanel
        stateRef={tabStateRef}
        css={{ height: '100%', overflow: 'hidden' }}
      >
        {!data ? (
          <LoadingIndicator />
        ) : !isEmpty(data?.namespaces) ? (
          <FullHeightTableWrap>
            <Table
              virtualizeRows
              data={data?.namespaces || []}
              columns={columns}
              css={{
                maxHeight: 'unset',
                height: '100%',
              }}
              onRowClick={(_e, { original }: Row<Namespace>) =>
                navigate(
                  getNamespacesDetailsPath({
                    namespaceId: original.metadata?.uid,
                  })
                )
              }
              //   fetchNextPage={fetchNextPage}
              isFetchingNextPage={loading}
              reactTableOptions={reactTableOptions}
              reactVirtualOptions={NAMESPACES_REACT_VIRTUAL_OPTIONS}
              //   onVirtualSliceChange={setVirtualSlice}
            />
          </FullHeightTableWrap>
        ) : (
          <div css={{ height: '100%' }}>
            <EmptyState message="Looks like you don't have any service deployments yet." />
          </div>
        )}
      </TabPanel>
    </div>
  )
}
