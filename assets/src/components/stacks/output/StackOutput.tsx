import {
  EyeClosedIcon,
  EyeIcon,
  IconFrame,
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
import CopyButton from 'components/utils/CopyButton'
import { ObscuredToken } from 'components/profile/ObscuredToken'

import {
  StackOutput as StackOutputT,
  useStackOutputQuery,
} from '../../../generated/graphql'

import { StackOutletContextT, getBreadcrumbs } from '../Stacks'
import LoadingIndicator from '../../utils/LoadingIndicator'

const columnHelper = createColumnHelper<StackOutputT>()

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
  columnHelper.accessor((row) => row, {
    id: 'value',
    header: 'Value',
    meta: { truncate: true },
    cell: ({ getValue }) => {
      const output = getValue()

      return (
        <OutputValue
          value={output.value}
          secret={!!output?.secret}
        />
      )
    },
  }),
  columnHelper.accessor((row) => row.value, {
    id: 'actions',
    header: '',
    cell: ({ getValue }) => (
      <CopyButton
        text={getValue() || ''}
        tooltip="Copy value"
        type="tertiary"
      />
    ),
  }),
]

function OutputValue({ value, secret }: { value: string; secret?: boolean }) {
  const theme = useTheme()
  const [reveal, setReveal] = useState(!secret)

  return (
    <div
      css={{
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.small,
      }}
    >
      <ObscuredToken
        token={value}
        reveal={reveal}
        reducedOpacity={false}
      />
      {secret && (
        <IconFrame
          className="icon"
          type="floating"
          clickable
          tooltip={reveal ? 'Hide value' : 'Reveal value'}
          icon={reveal ? <EyeIcon /> : <EyeClosedIcon />}
          onClick={() => setReveal((reveal) => !reveal)}
          css={{ width: 34 }}
        />
      )}
    </div>
  )
}

export default function StackOutput() {
  const theme = useTheme()
  const { stack } = useOutletContext() as StackOutletContextT
  const [filterString, setFilterString] = useState('')
  const debouncedFilterString = useDebounce(filterString, 100)

  useSetBreadcrumbs(
    useMemo(
      () => [...getBreadcrumbs(stack.id, stack.name), { label: 'output' }],
      [stack]
    )
  )

  const { data, loading } = useStackOutputQuery({
    variables: { id: stack.id ?? '' },
    fetchPolicy: 'no-cache',
    skip: !stack.id,
  })

  if (loading) return <LoadingIndicator />

  const output = data?.infrastructureStack?.output

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        rowGap: theme.spacing.medium,
        height: '100%',
      }}
    >
      <div
        css={{
          display: 'flex',
          columnGap: theme.spacing.medium,
          flexShrink: 0,
        }}
      >
        <Input
          placeholder="Search"
          startIcon={<SearchIcon />}
          value={filterString}
          onChange={(e) => setFilterString(e.currentTarget.value)}
          css={{ flexGrow: 1 }}
        />
      </div>
      <Table
        fullHeightWrap
        data={output || []}
        columns={columns}
        reactTableOptions={{
          state: { globalFilter: debouncedFilterString },
        }}
        emptyStateProps={{ message: 'No outputs found.' }}
      />
    </div>
  )
}
