import { createColumnHelper } from '@tanstack/react-table'
import { Div, Flex, Input, type InputProps, P } from 'honorable'
import React, {
  type ComponentProps,
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { Row } from '@tanstack/react-table'

import { useTheme } from 'styled-components'

import {
  AppIcon,
  ArrowRightLeftIcon,
  CollapseIcon,
  LogsIcon,
  Table,
  Tooltip,
} from '..'

type Method = {
  id?: string | number
  function: string
  inputType: string
  returnedValue: ReactElement<any> | string
  description: string
  expandable?: boolean
}

function StringLabel() {
  return (
    <Flex
      gap="xsmall"
      justifyContent="space-between"
      alignItems="center"
    >
      String
      <AppIcon
        name="String"
        icon={<LogsIcon />}
        size="xxsmall"
      />
    </Flex>
  )
}

function BoolLabel() {
  return (
    <Flex
      gap="xsmall"
      justifyContent="space-between"
      alignItems="center"
    >
      Boolean
      <AppIcon
        name="Boolean"
        icon={<ArrowRightLeftIcon />}
        size="xxsmall"
      />
    </Flex>
  )
}

const data: Method[] = [
  {
    function: 'fileExists',
    inputType: 'Path (string)',
    returnedValue: <BoolLabel />,
    description: 'Joins parts of a path',
  },
  {
    function: 'pathJoin',
    inputType: 'Object (interface{}), Path (string), Value (interface{})',
    returnedValue: <StringLabel />,
    description: 'Allows for getting values from other applications...',
    expandable: true,
  },
  {
    function: 'repoRoot',
    inputType: 'fileExists',
    returnedValue: <StringLabel />,
    description:
      'Allows for getting values from other applications stored in the contex file. For   example, to use the hostname configured for Grafana in another application {{ .Configuration.grafana.hostname }} can be used.',
    expandable: true,
  },
  {
    function: 'repoName',
    inputType: 'Object (interface{}), Path (string), Value (interface{})',
    returnedValue: <StringLabel />,
    description: 'Allows for getting values from other applications...',
    expandable: true,
  },
]

const columnHelper = createColumnHelper<Method>()

const columns = [
  columnHelper.accessor((row) => row.function, {
    id: 'function',
    enableGlobalFilter: true,
    enableSorting: true,
    cell: (info: any) => info.getValue(),
    header: () => (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div>Function</div>
        <div style={{ fontSize: 12, fontWeight: 400 }}>Caption</div>
      </div>
    ),
  }),
  columnHelper.accessor((row) => row.id, {
    id: 'id',
    enableSorting: true,
    cell: (info: any) => info.getValue(),
    header: () => <span>ID</span>,
  }),
  columnHelper.accessor((row) => row.inputType, {
    id: 'inputType',
    enableSorting: true,
    cell: (info: any) => (
      <Tooltip
        placement="top-start"
        label={info.getValue()}
      >
        <span>{info.getValue()}</span>
      </Tooltip>
    ),
    header: () => <span>Input (type)</span>,
    meta: {
      truncate: true,
      gridTemplate: 'minmax(150px, 1fr)',
    },
  }),
  columnHelper.accessor((row) => row.returnedValue, {
    id: 'returnedValue',
    cell: (info) => (
      <span>{info.row.index % 30 === 0 ? info.getValue() : null}</span>
    ),
    header: () => <span>Type</span>,
  }),
  columnHelper.accessor((row) => row.description, {
    id: 'description',
    enableGlobalFilter: true,
    meta: { tooltip: 'Tooltip message' },
    cell: (info: any) => <span>{info.getValue()}</span>,
    header: () => (
      <Flex
        gap="xsmall"
        alignItems="center"
        justifyContent="space-between"
      >
        Description
      </Flex>
    ),
  }),
]

const expandingColumns = [
  {
    id: 'expander',
    header: () => {},
    cell: ({ row }: any) =>
      row.getCanExpand() && (
        <CollapseIcon
          size={8}
          cursor="pointer"
          style={
            row.getIsExpanded()
              ? {
                  transform: 'rotate(270deg)',
                  transitionDuration: '.2s',
                  transitionProperty: 'transform',
                }
              : {
                  transform: 'rotate(180deg)',
                  transitionDuration: '.2s',
                  transitionProperty: 'transform',
                }
          }
          onClick={row.getToggleExpandedHandler()}
        />
      ),
  },
  columnHelper.accessor((row) => row.function, {
    id: 'function',
    cell: (info: any) => info.getValue(),
    header: () => <span>Function</span>,
  }),
  columnHelper.accessor((row) => row.inputType, {
    id: 'inputType',
    cell: (info: any) => <span>{info.getValue()}</span>,
    header: () => <span>Input (type)</span>,
  }),
  columnHelper.accessor((row) => row.returnedValue, {
    id: 'returnedValue',
    cell: (info: any) => <span>{info.getValue()}</span>,
    header: () => <span>Returned value</span>,
  }),
  columnHelper.accessor((row) => row.description, {
    id: 'description',
    cell: (info: any) => <span>{info.getValue()}</span>,
    header: () => <span>Description</span>,
  }),
]

export default {
  title: 'Table',
  component: Table,
}

function Template(args: any) {
  return <Table {...args} />
}

function PagedTemplate({ data, pageSize, ...args }: any) {
  const theme = useTheme()
  const [endIndex, setEndIndex] = useState(pageSize - 1)
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false)
  const pagedData = useMemo(
    () => (data as any[]).slice(0, endIndex),
    [data, endIndex]
  )
  const hasNextPage = pagedData.length < data.length
  const [virtualSlice, setVirtualSlice] = useState(null)

  const onVirtualSliceChange = useCallback<
    ComponentProps<typeof Table>['onVirtualSliceChange']
  >((vSlice) => {
    setVirtualSlice(vSlice)
  }, [])

  useEffect(() => {
    if (isFetchingNextPage) {
      let cancelled = false

      setTimeout(() => {
        if (cancelled) {
          return
        }
        const nextEndIndex = endIndex + pageSize

        setEndIndex(nextEndIndex > data.length - 1 ? data.length : nextEndIndex)
        setIsFetchingNextPage(false)
      }, 1500)

      return () => {
        cancelled = true
      }
    }
  }, [data.length, endIndex, isFetchingNextPage, pageSize])

  return (
    <>
      <Table
        {...args}
        virtualizeRows
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={() => {
          setIsFetchingNextPage(true)
        }}
        reactTableOptions={{
          getRowId: (_, index) => `key-${index}`,
        }}
        onVirtualSliceChange={onVirtualSliceChange}
        data={pagedData}
      />
      {virtualSlice && (
        <p style={{ ...theme.partials.text.body2 }}>
          Virtual slice start index: {virtualSlice.start.index}
          <br />
          Virtual slice end index: {virtualSlice.end.index}
        </p>
      )}
    </>
  )
}

function SelectableTemplate(args: any) {
  const [selectedId, setSelectedId] = useState('')

  return (
    <Table
      {...args}
      onRowClick={(_, row) => {
        setSelectedId(row.original.id?.toString() ?? '')
      }}
      reactTableOptions={{
        state: { rowSelection: { [selectedId]: true } },
        enableRowSelection: true,
        enableMultiRowSelection: false,
      }}
    />
  )
}

// A debounced input react component
function DebouncedInput({
  initialValue,
  onChange,
  debounce = 200,
  ...props
}: {
  initialValue: string | number
  onChange: (value: string | number) => void
  debounce?: number
} & Omit<InputProps, 'onChange' | 'value'>) {
  const [value, setValue] = React.useState(initialValue)

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value)
    }, debounce)

    return () => clearTimeout(timeout)
  }, [debounce, onChange, value])

  return (
    <Input
      {...props}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  )
}

function FilterableTemplate(args: ComponentProps<typeof Table>) {
  const [globalFilter, setGlobalFilter] = React.useState('')

  return (
    <Div maxWidth="900px">
      <DebouncedInput
        initialValue={globalFilter}
        onChange={(value) => setGlobalFilter(String(value))}
        marginBottom="small"
        placeholder="Filter by Function or Description'"
      />
      <Table
        reactTableOptions={{
          state: { globalFilter },
        }}
        {...args}
      />
    </Div>
  )
}

const repeatedData = Array(25)
  .fill(data)
  .flat()
  .map((item, i) => ({ ...item, id: `id-${i}` }))

const extremeLengthData = Array(200)
  .fill(data)
  .flat()
  .map((item, i) => ({ ...item, id: `id-${i}` }))

export const Default = Template.bind({})
Default.args = {
  fillLevel: 0,
  rowBg: 'base',
  width: '900px',
  height: '400px',
  data: repeatedData,
  columns,
}

export const Empty = Template.bind({})
Empty.args = {
  fillLevel: 0,
  rowBg: 'base',
  width: '900px',
  height: '400px',
  data: [],
  columns,
}

export const Loading = Template.bind({})
Loading.args = {
  fillLevel: 0,
  rowBg: 'base',
  width: '900px',
  height: '400px',
  data: [],
  columns,
  loading: true,
}

export const Highlighted = Template.bind({})
Highlighted.args = {
  fillLevel: 0,
  rowBg: 'base',
  width: '900px',
  height: '400px',
  data: repeatedData,
  columns: (() => {
    const c = [...columns]

    c.splice(
      2,
      0,
      columnHelper.accessor((row) => row.id, {
        id: 'h',
        cell: ({ getValue }) => getValue(),
        header: 'Highlight',
        meta: {
          highlight: true,
          truncate: true,
          gridTemplate: 'minmax(150px, 1fr)',
        },
      })
    )

    return c
  })(),
  reactTableOptions: { getRowId: (_: any, index: any) => index },
  highlightedRowId: 1,
}

export const VirtualizedRows = Template.bind({})
VirtualizedRows.args = {
  fillLevel: 0,
  rowBg: 'base',
  virtualizeRows: true,
  width: '900px',
  height: '400px',
  data: extremeLengthData,
  columns,
}

export const PagedData = PagedTemplate.bind({})
PagedData.args = {
  fillLevel: 0,
  rowBg: 'base',
  pageSize: 30,
  width: '900px',
  height: '400px',
  data: extremeLengthData,
  columns,
}

export const Loose = Template.bind({})

Loose.args = {
  fillLevel: 0,
  rowBg: 'base',
  width: '900px',
  height: '400px',
  data: repeatedData,
  columns,
  loose: true,
}

export const Clickable = Template.bind({})

Clickable.args = {
  fillLevel: 0,
  rowBg: 'base',
  width: '900px',
  height: '400px',
  data: repeatedData,
  columns: expandingColumns,
  onRowClick: (e: MouseEvent, row: Row<any>) => console.info(row?.original),
}

export const StickyColumn = Template.bind({})

StickyColumn.args = {
  fillLevel: 0,
  rowBg: 'base',
  width: '400px',
  height: '400px',
  data: repeatedData,
  columns,
  stickyColumn: true,
}

export const Expandable = Template.bind({})

Expandable.args = {
  fillLevel: 0,
  rowBg: 'base',
  width: '900px',
  height: '400px',
  data: repeatedData,
  columns: expandingColumns,
  getRowCanExpand: (row: Row<Method>) => row.original.expandable,
  renderExpanded: ({ row }: { row: Row<Method> }) => (
    <P>{row.original.description}</P>
  ),
}

export const FilterableAndSortable = FilterableTemplate.bind({})
FilterableAndSortable.args = {
  fillLevel: 0,
  rowBg: 'base',
  virtualizeRows: true,
  emptyStateProps: {
    message: 'No results match your query',
  },
  width: 'auto',
  height: '400px',
  data: extremeLengthData,
  columns,
}

export const Selectable = SelectableTemplate.bind({})

Selectable.args = {
  fillLevel: 0,
  rowBg: 'base',
  width: '900px',
  height: '400px',
  data: repeatedData,
  columns: expandingColumns,
}

export const LinkableRows = Template.bind({})

LinkableRows.args = {
  fillLevel: 0,
  rowBg: 'base',
  width: '900px',
  height: '400px',
  data: repeatedData,
  columns: [
    ...columns.slice(0, 2),
    columnHelper.display({
      id: 'actions',
      header: () => <span>Actions</span>,
      cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            alert(`Action clicked for: ${row.original.function}`)
          }}
          style={{
            padding: '4px 12px',
            cursor: 'pointer',
            background: '#1a1d24',
            border: '1px solid #3d4149',
            borderRadius: '4px',
            color: '#babbbd',
          }}
        >
          Action
        </button>
      ),
    }),
    ...columns.slice(2),
  ],
  onRowClick: (e: MouseEvent, row: Row<any>) => console.log(row?.original),
  getRowLink: (row: Row<Method>) =>
    `https://example.com/function/${row.original.function}`,
}
