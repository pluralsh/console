import { Flex } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { Body2BoldP } from 'components/utils/typography/Text'
import {
  actionColumns,
  promptColumn,
  userColumn,
  workbenchColumn,
  WorkbenchJobsTableContent,
} from 'components/workbenches/workbench/WorkbenchJobsTable'
import { WorkbenchJobCreateInput } from 'components/workbenches/workbench/WorkbenchJobCreateInput'
import {
  useFlowWorkbenchJobsQuery,
  useFlowWorkbenchesQuery,
} from 'generated/graphql'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { AttachWorkbenchesModal } from './AttachWorkbenchesModal'
import { FlowSidePanel } from './FlowSidePanel'
import { type FlowOutletContext, useFlowSidePanel } from './Flow'

export function FlowWorkbenches() {
  const { flow } = useOutletContext<FlowOutletContext>()
  const { setSidePanelContent } = useFlowSidePanel()
  const [attachModalOpen, setAttachModalOpen] = useState(false)
  const [selectedWorkbenchId, setSelectedWorkbenchId] =
    useState<Nullable<string>>(null)
  const openAttachModal = useCallback(() => setAttachModalOpen(true), [])
  const {
    data: workbenchesData,
    loading: workbenchesLoading,
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

  useEffect(() => {
    if (!workbenchesData) return
    if (!workbenches.length) {
      setSelectedWorkbenchId(null)
      return
    }

    if (!workbenches.some((workbench) => workbench.id === selectedWorkbenchId))
      setSelectedWorkbenchId(workbenches[0]?.id ?? null)
  }, [selectedWorkbenchId, workbenches, workbenchesData])

  if (workbenchesError) return <GqlError error={workbenchesError} />
  if (jobsError) return <GqlError error={jobsError} />

  return (
    <>
      <WrapperSC>
        <WorkbenchJobCreateInput
          workbenchId={selectedWorkbenchId}
          setWorkbenchId={setSelectedWorkbenchId}
          workbenchOptions={workbenches}
          flowId={flow?.id}
          workbenchLoading={workbenchesLoading && !workbenchesData}
          disabled={!workbenches.length}
          placeholder="Send a job to your flow workbenches. Use / for skills and @ to mention services in this flow"
          wrapperStyles={{ maxWidth: 'none' }}
        />
        <Body2BoldP>Workbench Jobs</Body2BoldP>
        <TableContainerSC>
          <WorkbenchJobsTableContent
            jobs={jobs}
            loading={jobsLoading}
            loaded={!!jobsData}
            pageInfo={jobsPageInfo}
            fetchNextPage={fetchNextJobsPage}
            setVirtualSlice={setJobsVirtualSlice}
            columns={[
              userColumn,
              promptColumn,
              workbenchColumn,
              ...actionColumns,
            ]}
          />
        </TableContainerSC>
      </WrapperSC>
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

const WrapperSC = styled(Flex)(({ theme }) => ({
  flexDirection: 'column',
  gap: theme.spacing.medium,
  minHeight: 400,
  height: '100%',
  overflow: 'hidden',
}))

const TableContainerSC = styled.div({
  flex: 1,
  minHeight: 0,
})
