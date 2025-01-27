import {
  Input,
  SearchIcon,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { createColumnHelper } from '@tanstack/react-table'
import { useDebounce } from '@react-hooks-library/core'

import { StackOutletContextT, getBreadcrumbs } from '../Stacks'

const columnHelper = createColumnHelper<{
  name: string
  value: Nullable<string>
}>()

const columns = [
  columnHelper.accessor((row) => row.name, {
    id: 'name',
    header: 'Name',
    enableGlobalFilter: true,
    meta: { truncate: true },
    cell: ({ getValue }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const theme = useTheme()

      return <span css={{ ...theme.partials.text.code }}>{getValue()}</span>
    },
  }),
  columnHelper.accessor((row) => row.value, {
    id: 'value',
    header: 'Value',
    meta: { truncate: true },
    cell: ({ getValue }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const theme = useTheme()

      return (
        <span css={{ ...theme.partials.text.code }}>
          {JSON.stringify(getValue())}
        </span>
      )
    },
  }),
]

export default function StackVariables() {
  const theme = useTheme()
  const { stack } = useOutletContext() as StackOutletContextT
  const [filterString, setFilterString] = useState('')
  const debouncedFilterString = useDebounce(filterString, 100)

  const variables = useMemo(
    () =>
      stack.variables
        ? Object.entries(stack.variables).map(([name, value]) => ({
            name,
            value,
          }))
        : [],
    [stack.variables]
  )

  useSetBreadcrumbs(
    useMemo(
      () => [...getBreadcrumbs(stack.id, stack.name), { label: 'variables' }],
      [stack]
    )
  )

  return (
    <div css={{ overflow: 'hidden' }}>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          rowGap: theme.spacing.medium,
          height: '100%',
        }}
      >
        <div>
          <Input
            placeholder="Search"
            startIcon={<SearchIcon />}
            value={filterString}
            onChange={(e) => setFilterString(e.currentTarget.value)}
          />
        </div>
        <Table
          fullHeightWrap
          data={variables}
          columns={columns}
          reactTableOptions={{
            state: { globalFilter: debouncedFilterString },
          }}
          emptyStateProps={{ message: 'No variables set.' }}
        />
      </div>
    </div>
  )
}
