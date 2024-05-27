import {
  Card,
  CheckIcon,
  CloseIcon,
  EmptyState,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import React, { ReactNode, useMemo } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useTheme } from 'styled-components'

import { createColumnHelper } from '@tanstack/react-table'

import { StackOutletContextT, getBreadcrumbs } from '../Stack'
import ConsolePageTitle from '../../../utils/layout/ConsolePageTitle'
import { StackFile } from '../../../../generated/graphql'
import OutputValue from '../run/output/Value'

const columnHelper = createColumnHelper<StackFile>()

const colPath = columnHelper.accessor((o) => o.path, {
  id: 'path',
  header: 'Path',
  cell: ({ getValue }) => <span>{getValue()}</span>,
})

const colContent = columnHelper.accessor((o) => o, {
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
})

function useColumns(): Array<object> {
  return useMemo(() => [colPath, colContent], [])
}

export default function StackFiles() {
  const theme = useTheme()
  const { stackId = '' } = useParams()
  const { stack } = useOutletContext() as StackOutletContextT
  const columns = useColumns()
  const hasFiles = stack.files?.length ?? 0 > 0

  useSetBreadcrumbs(
    useMemo(
      () => [...getBreadcrumbs(stackId), { label: 'repository' }],
      [stackId]
    )
  )

  if (!stack) {
    return <LoadingIndicator />
  }

  return (
    <>
      <ConsolePageTitle
        heading="Files"
        headingProps={{
          paddingTop: theme.spacing.small,
          paddingBottom: theme.spacing.medium,
        }}
      />
      {!hasFiles ? (
        <EmptyState message="No files available for this stack." />
      ) : (
        <Table
          data={stack.files ?? []}
          columns={columns}
          maxHeight="100%"
        />
      )}
    </>
  )
}
