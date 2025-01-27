import { Table, useSetBreadcrumbs } from '@pluralsh/design-system'
import { ReactNode, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { createColumnHelper } from '@tanstack/react-table'

import { StackFile, useStackFilesQuery } from '../../../generated/graphql'

import OutputValue from '../run/output/Value'
import { StackOutletContextT, getBreadcrumbs } from '../Stacks'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { FullHeightTableWrap } from '../../utils/layout/FullHeightTableWrap'

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
      () => [...getBreadcrumbs(stack.id, stack.name), { label: 'files' }],
      [stack]
    )
  )

  const { data, loading } = useStackFilesQuery({
    variables: { id: stack.id ?? '' },
    fetchPolicy: 'no-cache',
    skip: !stack.id,
  })

  if (loading) return <LoadingIndicator />

  const files = data?.infrastructureStack?.files

  return (
    <FullHeightTableWrap>
      <Table
        data={files ?? []}
        columns={columns}
        emptyStateProps={{ message: 'No files found.' }}
      />
    </FullHeightTableWrap>
  )
}
