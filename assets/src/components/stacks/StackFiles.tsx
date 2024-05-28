import { EmptyState, Table, useSetBreadcrumbs } from '@pluralsh/design-system'
import React, { ReactNode, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { createColumnHelper } from '@tanstack/react-table'
import { isEmpty } from 'lodash'

import { StackFile } from '../../generated/graphql'

import OutputValue from './run/output/Value'
import { StackOutletContextT, getBreadcrumbs } from './Stacks'

const columnHelper = createColumnHelper<StackFile>()

const columns = [
  columnHelper.accessor((o) => o.path, {
    id: 'path',
    header: 'Path',
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((o) => o, {
    id: 'content',
    header: 'Content',
    cell: function Cell({ getValue }): ReactNode {
      const output = getValue()

      return (
        <OutputValue
          value={output.content}
          secret={false}
        />
      )
    },
  }),
]

export default function StackFiles() {
  const { stack } = useOutletContext() as StackOutletContextT

  useSetBreadcrumbs(
    useMemo(
      () => [...getBreadcrumbs(stack.id ?? ''), { label: 'files' }],
      [stack.id]
    )
  )

  if (isEmpty(stack.files))
    return <EmptyState message="No files available for this stack." />

  return (
    <Table
      data={stack.files ?? []}
      columns={columns}
      maxHeight="100%"
    />
  )
}
