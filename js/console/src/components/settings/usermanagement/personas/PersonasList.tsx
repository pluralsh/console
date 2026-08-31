import { Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { PersonaFragment, usePersonasQuery } from 'generated/graphql'
import { useMemo } from 'react'

import { GqlError } from '../../../utils/Alert'
import { Info } from '../../../utils/Info'
import { useFetchPaginatedData } from '../../../utils/table/useFetchPaginatedData'

import { mapExistingNodes } from 'utils/graphql'
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
    () => mapExistingNodes(data?.personas),
    [data?.personas]
  )

  if (error) return <GqlError error={error} />

  return (
    <Table
      hideHeader
      fullHeightWrap
      virtualizeRows
      rowBg="base"
      loading={!data && loading}
      data={personas}
      columns={columns}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
      emptyStateProps={{
        message: "Looks like you don't have any personas yet.",
        children: <PersonaCreate />,
      }}
    />
  )
}
