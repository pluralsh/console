import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { WorkbenchJobsTableContent } from 'components/workbenches/workbench/WorkbenchJobsTable'
import {
  useFlowWorkbenchJobsQuery,
  useFlowWorkbenchesQuery,
} from 'generated/graphql'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { AttachWorkbenchesModal } from './AttachWorkbenchesModal'
import { FlowSidePanel } from './FlowSidePanel'
import { type FlowOutletContext, useFlowSidePanel } from './Flow'

export function FlowWorkbenches() {
  const { flow } = useOutletContext<FlowOutletContext>()
  const { setSidePanelContent } = useFlowSidePanel()
  const [attachModalOpen, setAttachModalOpen] = useState(false)
  const openAttachModal = useCallback(() => setAttachModalOpen(true), [])
  const {
    data: workbenchesData,
    error: workbenchesError,
    refetch: refetchWorkbenches,
  } = useFlowWorkbenchesQuery({
    variables: { id: flow?.id ?? '' },
    skip: !flow?.id,
  })
  const {
    data: jobsData,
    loading: jobsLoading,
    error: jobsError,
    pageInfo: jobsPageInfo,
    fetchNextPage: fetchNextJobsPage,
    setVirtualSlice: setJobsVirtualSlice,
  } = useFetchPaginatedData(
    {
      queryHook: useFlowWorkbenchJobsQuery,
      keyPath: ['flow', 'workbenchJobs'],
      skip: !flow?.id,
    },
    { id: flow?.id ?? '' }
  )

  const workbenches = useMemo(
    () => (workbenchesData?.flow?.workbenches ?? []).filter(isNonNullable),
    [workbenchesData]
  )
  const jobs = useMemo(
    () => mapExistingNodes(jobsData?.flow?.workbenchJobs),
    [jobsData]
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

  if (workbenchesError) return <GqlError error={workbenchesError} />
  if (jobsError) return <GqlError error={jobsError} />

  return (
    <>
      <WorkbenchJobsTableContent
        jobs={jobs}
        loading={jobsLoading}
        loaded={!!jobsData}
        pageInfo={jobsPageInfo}
        fetchNextPage={fetchNextJobsPage}
        setVirtualSlice={setJobsVirtualSlice}
      />
      {flow?.name && (
        <AttachWorkbenchesModal
          flowName={flow.name}
          attachedWorkbenches={workbenches}
          open={attachModalOpen}
          onClose={() => setAttachModalOpen(false)}
          onUpdated={() => refetchWorkbenches()}
        />
      )}
    </>
  )
}
