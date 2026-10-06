import { Flex } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import {
  DisplayPopover,
  DisplayView,
  DisplayViewToggle,
  usePersistedDisplayView,
} from 'components/utils/display/DisplayPanel'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { useWorkbenchJobsQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { WorkbenchOutletContext, WorkbenchPageLayout } from './Workbench'
import { WorkbenchJobsBoard } from './WorkbenchJobsBoard'
import { WorkbenchJobsDetails } from './WorkbenchJobsDetails'
import { WorkbenchJobsSearch } from './WorkbenchJobsSearch'
import { WorkbenchJobsTableContent } from './WorkbenchJobsTable'

const WORKBENCH_JOBS_VIEW_STORAGE_KEY = 'workbench-jobs-view'
const WORKBENCH_JOBS_VIEWS: DisplayView[] = ['list', 'board', 'details']
const DEFAULT_WORKBENCH_JOBS_VIEW: DisplayView = 'list'

export function WorkbenchJobs() {
  const { workbenchId } = useOutletContext<WorkbenchOutletContext>()
  const [view, setView] = usePersistedDisplayView(
    WORKBENCH_JOBS_VIEW_STORAGE_KEY,
    WORKBENCH_JOBS_VIEWS,
    DEFAULT_WORKBENCH_JOBS_VIEW
  )

  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useWorkbenchJobsQuery, keyPath: ['workbench', 'runs'] },
      { id: workbenchId }
    )
  const jobs = useMemo(() => mapExistingNodes(data?.workbench?.runs), [data])

  return (
    <WorkbenchPageLayout
      showEditWorkbenchButton={false}
      headerActions={
        <>
          {view !== 'details' && (
            <WorkbenchJobsSearch workbenchId={workbenchId} />
          )}
          <DisplayPopover showDot={false}>
            <DisplayViewToggle
              view={view}
              views={WORKBENCH_JOBS_VIEWS}
              onChange={setView}
            />
          </DisplayPopover>
        </>
      }
    >
      {error ? (
        <GqlError error={error} />
      ) : view === 'details' ? (
        <WorkbenchJobsDetails
          workbenchId={workbenchId}
          jobs={jobs}
          loading={loading}
          hasNextPage={!!pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
        />
      ) : (
        <WrapperSC>
          {view === 'board' ? (
            <WorkbenchJobsBoard
              jobs={jobs}
              loading={loading}
              hasNextPage={!!pageInfo?.hasNextPage}
              fetchNextPage={fetchNextPage}
            />
          ) : (
            <TableContainerSC>
              <WorkbenchJobsTableContent
                jobs={jobs}
                loading={loading}
                loaded={!!data}
                pageInfo={pageInfo}
                fetchNextPage={fetchNextPage}
                setVirtualSlice={setVirtualSlice}
              />
            </TableContainerSC>
          )}
        </WrapperSC>
      )}
    </WorkbenchPageLayout>
  )
}

const WrapperSC = styled(Flex)(({ theme }) => ({
  flexDirection: 'column',
  gap: theme.spacing.large,
  flex: 1,
  minHeight: 400,
  overflow: 'hidden',
  padding: `${theme.spacing.medium}px ${theme.spacing.large}px`,
}))

const TableContainerSC = styled.div({
  flex: 1,
  minHeight: 0,
})
