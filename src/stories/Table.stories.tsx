import { createColumnHelper } from '@tanstack/react-table'
import { Div, Flex, Input, type InputProps, P } from 'honorable'
import React, { type ComponentProps, type ReactElement, useEffect } from 'react'
import type { Row } from '@tanstack/react-table'

import {
  AppIcon,
  ArrowRightLeftIcon,
  CollapseIcon,
  IconFrame,
  InfoIcon,
  LogsIcon,
  Table,
  Tooltip,
} from '..'

type Method = {
  id?: string | number
  function: string
  inputType: string
  returnedValue: ReactElement | string
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
    header: () => <span>Function</span>,
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
    cell: (info: any) => <span>{info.getValue()}</span>,
    header: () => <span>Returned value</span>,
  }),
  columnHelper.accessor((row) => row.description, {
    id: 'description',
    enableGlobalFilter: true,
    cell: (info: any) => <span>{info.getValue()}</span>,
    header: () => (
      <Flex
        gap="xsmall"
        alignItems="center"
        justifyContent="space-between"
      >
        Description{' '}
        <IconFrame
          clickable
          textValue="Book"
          icon={<InfoIcon />}
          size="small"
        />
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
  .map((item, i) => ({ ...item, id: i }))

const extremeLengthData = Array(200)
  .fill(data)
  .flat()
  .map((item, i) => ({ ...item, id: i }))

export const Default = Template.bind({})

Default.args = {
  width: '900px',
  height: '400px',
  data: repeatedData,
  columns,
}

export const VirtualizedRows = Template.bind({})
VirtualizedRows.args = {
  virtualizeRows: true,
  width: '900px',
  height: '400px',
  data: extremeLengthData,
  columns,
}

export const Loose = Template.bind({})

Loose.args = {
  width: '900px',
  height: '400px',
  data: repeatedData,
  columns,
  loose: true,
}

export const Clickable = Template.bind({})

Clickable.args = {
  width: '900px',
  height: '400px',
  data: repeatedData,
  columns: expandingColumns,
  onRowClick: (e: MouseEvent, row: Row<any>) => console.log(row?.original),
}

export const StickyColumn = Template.bind({})

StickyColumn.args = {
  width: '400px',
  height: '400px',
  data: repeatedData,
  columns,
  stickyColumn: true,
}

export const Expandable = Template.bind({})

Expandable.args = {
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
  virtualizeRows: true,
  width: 'auto',
  height: '400px',
  data: extremeLengthData,
  columns,
}
