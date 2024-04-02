import { Chip } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'

import { PipelineFragment } from 'generated/graphql'
import { useTheme } from 'styled-components'

import { Edge } from 'utils/graphql'

import { ComponentProps } from 'react'

import { DateTimeCol } from 'components/utils/table/DateTimeCol'

import { DeletePipelineButton } from './DeletePipeline'

export const columnHelper = createColumnHelper<Edge<PipelineFragment>>()

const ColName = columnHelper.accessor(({ node }) => node?.name, {
  id: 'name',
  header: 'Pipeline name',
  meta: { truncate: true },
  cell: function Cell({ getValue }) {
    return <>{getValue()}</>
  },
})

const ColCreated = columnHelper.accessor(({ node }) => node?.insertedAt, {
  id: 'insertedAt',
  header: 'Created',
  cell: function Cell({ getValue }) {
    return <DateTimeCol date={getValue()} />
  },
})

const ColUpdated = columnHelper.accessor(({ node }) => node?.updatedAt, {
  id: 'updatedAt',
  header: 'Updated',
  cell: function Cell({ getValue }) {
    return <DateTimeCol date={getValue()} />
  },
})

type StatusLabel = 'Stopped' | 'Running' | 'Pending' | 'Complete'
const statusLabelToSeverity = {
  Stopped: 'danger',
  Running: 'info',
  Complete: 'success',
  Pending: 'warning',
} as const satisfies Record<
  StatusLabel,
  ComponentProps<typeof Chip>['severity']
>
const ColStatus = columnHelper.accessor(({ node }) => node?.status, {
  id: 'status',
  header: 'Status',
  cell: function Cell({ getValue }) {
    const theme = useTheme()
    const { closed, pending, running } = getValue() || {}
    const label: StatusLabel =
      (closed || 0) > 0
        ? 'Stopped'
        : (running || 0) > 0
        ? 'Running'
        : (pending || 0) > 0
        ? 'Pending'
        : 'Complete'

    return (
      <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
        <Chip severity={statusLabelToSeverity[label]}>{label}</Chip>
      </div>
    )
  },
})

export const ColActions = columnHelper.display({
  id: 'actions',
  header: '',
  cell: function Cell({ row: { original } }) {
    const pipeline = original.node

    if (!pipeline) {
      return null
    }

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        css={{ alignItems: 'center', alignSelf: 'end', display: 'flex' }}
      >
        <DeletePipelineButton pipeline={pipeline} />
      </div>
    )
  },
})

export const columns = [ColName, ColCreated, ColUpdated, ColStatus, ColActions]
