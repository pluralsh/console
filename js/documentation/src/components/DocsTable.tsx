import { Fragment, type ReactNode } from 'react'

import { Table } from '@pluralsh/design-system'

import { createColumnHelper } from '@tanstack/react-table'
import styled from 'styled-components'

import { brand } from '@src/theme/docsTheme'

type Cell = ReactNode

type DocsTableProps = {
  thead?: Cell[]
  tbody?: Cell[][]
}

// Markdown tables render through the design-system Table, but the grid lives
// here so it doesn't depend on that package's generated class names.
export function DocsTable({ thead, tbody }: DocsTableProps) {
  const columnHelper = createColumnHelper<Cell[]>()

  if (!tbody || !thead) return null

  const columns = thead.map((th, idx) =>
    columnHelper.accessor((row) => row[idx], {
      id: String(idx),
      cell: (info) => <Fragment key={idx}>{info.getValue()}</Fragment>,
      header: () => <span>{th}</span>,
    })
  )

  return (
    <DocsTableFrame>
      <Table
        columns={columns}
        data={tbody}
        flush
        rowBg="base"
      />
    </DocsTableFrame>
  )
}

const DocsTableFrame = styled.div(({ theme }) => ({
  border: '1px solid var(--table-line)',
  borderRadius: theme.borderRadiuses.large,
  overflow: 'hidden',
  marginBottom: theme.spacing.large,
  // The inner wrapper paints its own fill, border, and corner.
  '& > div > div': {
    backgroundColor: 'transparent !important',
    border: 'none !important',
    borderRadius: '0 !important',
    boxShadow: 'none !important',
  },
  // The last header cell's ::before paints the fill across the whole row;
  // filling the cells too would double the translucent header.
  '.thOuterWrap': {
    backgroundColor: 'transparent !important',
    color: `${brand.ink} !important`,
    fontSize: 14,
    fontWeight: 500,
    height: 44,
    minHeight: 44,
    padding: '0 16px',
    borderBottom: 'none !important',
  },
  'th:last-child::before': {
    backgroundColor: 'var(--table-header) !important',
    borderBottom: '1px solid var(--table-line) !important',
  },
  'th + th .thOuterWrap, td + td': {
    borderLeft: '1px solid var(--table-line)',
  },
  'tbody tr:nth-child(odd) td': {
    backgroundColor: 'transparent !important',
  },
  'tbody tr:nth-child(even) td': {
    backgroundColor: 'var(--table-stripe) !important',
  },
  td: {
    padding: '12px 16px',
    borderTop: '1px solid var(--table-line) !important',
  },
  'tbody tr:first-child td': {
    borderTop: 'none !important',
  },
}))
