import { Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import { useFlowWorkbenchesQuery } from 'generated/graphql'
import { useEffect, useMemo } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { getWorkbenchAbsPath } from 'routes/workbenchesRoutesConsts'
import { isNonNullable } from 'utils/isNonNullable'
import { FlowSidePanel, type FlowWorkbenchRow } from './FlowSidePanel'
import { type FlowOutletContext, useFlowSidePanel } from './Flow'

const columnHelper = createColumnHelper<FlowWorkbenchRow>()
const columns = [
  columnHelper.accessor((row) => row, {
    id: 'name',
    header: 'Workbench',
    meta: { gridTemplate: '1fr' },
    cell: ({ getValue }) => {
      const { name } = getValue()

      return <StackedText first={name} />
    },
  }),
]

export function FlowWorkbenches() {
  const { flow } = useOutletContext<FlowOutletContext>()
  const navigate = useNavigate()
  const { setSidePanelContent } = useFlowSidePanel()
  const { data, loading, error } = useFlowWorkbenchesQuery({
    variables: { id: flow?.id ?? '' },
    skip: !flow?.id,
  })

  const workbenches = useMemo<FlowWorkbenchRow[]>(
    () =>
      (data?.flow?.workbenches ?? [])
        .filter(isNonNullable)
        .map(({ id, name }) => ({ id, name })),
    [data]
  )

  useEffect(() => {
    setSidePanelContent(<FlowSidePanel workbenches={workbenches} />)

    return () => setSidePanelContent(null)
  }, [workbenches, setSidePanelContent])

  if (error) return <GqlError error={error} />

  return (
    <Table
      fullHeightWrap
      data={workbenches}
      columns={columns}
      loading={!data && loading}
      onRowClick={(_, row) => navigate(getWorkbenchAbsPath(row.original.id))}
      emptyStateProps={{ message: 'No workbenches found.' }}
    />
  )
}
