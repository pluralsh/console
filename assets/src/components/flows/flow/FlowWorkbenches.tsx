import { Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import {
  useFlowWorkbenchesQuery,
  WorkbenchTinyFragment,
} from 'generated/graphql'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { getWorkbenchAbsPath } from 'routes/workbenchesRoutesConsts'
import { isNonNullable } from 'utils/isNonNullable'
import { AttachWorkbenchesModal } from './AttachWorkbenchesModal'
import { FlowSidePanel } from './FlowSidePanel'
import { type FlowOutletContext, useFlowSidePanel } from './Flow'

const columnHelper = createColumnHelper<WorkbenchTinyFragment>()
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
  const [attachModalOpen, setAttachModalOpen] = useState(false)
  const openAttachModal = useCallback(() => setAttachModalOpen(true), [])
  const { data, loading, error, refetch } = useFlowWorkbenchesQuery({
    variables: { id: flow?.id ?? '' },
    skip: !flow?.id,
  })

  const workbenches = useMemo(
    () => (data?.flow?.workbenches ?? []).filter(isNonNullable),
    [data]
  )

  useEffect(() => {
    setSidePanelContent(
      <FlowSidePanel
        workbenches={workbenches}
        onAttachWorkbench={openAttachModal}
      />
    )

    return () => setSidePanelContent(null)
  }, [openAttachModal, workbenches, setSidePanelContent])

  if (error) return <GqlError error={error} />

  return (
    <>
      <Table
        fullHeightWrap
        data={workbenches}
        columns={columns}
        loading={!data && loading}
        onRowClick={(_, row) => navigate(getWorkbenchAbsPath(row.original.id))}
        emptyStateProps={{ message: 'No workbenches found.' }}
      />
      {flow?.name && (
        <AttachWorkbenchesModal
          flowName={flow.name}
          attachedWorkbenches={workbenches}
          open={attachModalOpen}
          onClose={() => setAttachModalOpen(false)}
          onUpdated={() => refetch()}
        />
      )}
    </>
  )
}
