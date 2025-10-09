import isEmpty from 'lodash/isEmpty'
import { EmptyState, Table } from '@pluralsh/design-system'
import { useMemo } from 'react'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { PersonaFragment, usePersonasQuery } from 'generated/graphql'
import { createColumnHelper } from '@tanstack/react-table'

import { GridTableWrapper } from '../../../utils/layout/ResponsiveGridLayouts'
import { GqlError } from '../../../utils/Alert'
import { Info } from '../../../utils/Info'
import { useFetchPaginatedData } from '../../../utils/table/useFetchPaginatedData'

import PersonaActions from './PersonaActions'
import PersonaCreate from './PersonaCreate'

const columnHelper = createColumnHelper<PersonaFragment>()
const columns = [
  columnHelper.accessor((persona) => persona, {
    id: 'info',
    cell: ({ getValue }) => {
      const persona = getValue()

      return (
        <Info
          text={persona.name}
          description={persona.description}
        />
      )
    },
  }),
  columnHelper.accessor((persona) => persona, {
    id: 'actions',
    meta: { gridTemplate: `fit-content(100px)` },
    cell: function Cell({ getValue }) {
      return <PersonaActions persona={getValue()} />
    },
  }),
]

export function PersonasList() {
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData({
      queryHook: usePersonasQuery,
      keyPath: ['personas'],
    })

  const personas = useMemo(
    () => data?.personas?.edges?.map((edge) => edge?.node),
    [data?.personas?.edges]
  )

  if (error) return <GqlError error={error} />
  if (!data?.personas?.edges) return <LoadingIndicator />

  return !isEmpty(personas) ? (
    <GridTableWrapper>
      <Table
        virtualizeRows
        rowBg="raised"
        data={personas || []}
        columns={columns}
        hideHeader
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
      />
    </GridTableWrapper>
  ) : (
    <EmptyState message={"Looks like you don't have any personas yet."}>
      <PersonaCreate />
    </EmptyState>
  )
}
