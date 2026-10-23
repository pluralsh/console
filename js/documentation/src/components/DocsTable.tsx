import { Children, type ReactNode } from 'react'

import styled from 'styled-components'

import { brand } from '@src/theme/docsTheme'

type Cell = ReactNode

type DocsTableProps = {
  thead?: Cell[]
  tbody?: Cell[][]
}

// Markdown tables are static, so they render as a plain table rather than the
// design-system Table, whose per-instance table state and virtualizer
// measurements dominate render time on pages with hundreds of tables.
export function DocsTable({ thead, tbody }: DocsTableProps) {
  if (!tbody || !thead) return null

  return (
    <DocsTableFrame>
      <table>
        <thead>
          <tr>
            {thead.map((th, i) => (
              <th key={i}>{Children.toArray(th)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tbody.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{Children.toArray(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </DocsTableFrame>
  )
}

const DocsTableFrame = styled.div(({ theme }) => ({
  border: '1px solid var(--table-line)',
  borderRadius: theme.borderRadiuses.large,
  overflowX: 'auto',
  marginBottom: theme.spacing.large,
  table: {
    ...theme.partials.text.body2LooseLineHeight,
    width: '100%',
    borderCollapse: 'collapse',
    borderSpacing: 0,
  },
  th: {
    ...theme.partials.text.caption,
    backgroundColor: 'var(--table-header)',
    borderBottom: '1px solid var(--table-line)',
    color: brand.ink,
    fontSize: 14,
    fontWeight: 500,
    height: 44,
    padding: '0 16px',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  },
  td: {
    color: theme.colors['text-light'],
    padding: '12px 16px',
    borderTop: '1px solid var(--table-line)',
    verticalAlign: 'middle',
  },
  'th + th, td + td': {
    borderLeft: '1px solid var(--table-line)',
  },
  'tbody tr:first-child td': {
    borderTop: 'none',
  },
  'tbody tr:nth-child(even) td': {
    backgroundColor: 'var(--table-stripe)',
  },
}))
