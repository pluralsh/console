import { Flex } from '@pluralsh/design-system'
import { SidePanelContent } from 'components/ai/chatbot/SidePanelShared'
import {
  SidePanel,
  useTopLevelSidePanel,
} from 'components/layout/TopLevelSidePanel'
import { useParams } from 'react-router-dom'
import { WORKBENCH_JOBS_PARAM_JOB } from 'routes/workbenchesRoutesConsts'
import { isNonNullable } from 'utils/isNonNullable'
import { WorkbenchJobPrs } from './WorkbenchJobPrs'
import { WorkbenchJobResult } from './WorkbenchJobResult'
import { WorkbenchJobTodos } from './WorkbenchJobTodos'
import { WorkbenchJobTriggerAlert } from './WorkbenchJobTriggerAlert'
import { WorkbenchJobTriggerIssue } from './WorkbenchJobTriggerIssue'
import { useWorkbenchJobQuery } from 'generated/graphql'

const SIDE_PANEL_TYPE: SidePanel = 'workbench-job'

export function WorkbenchJobPanelContent() {
  const jobId = useParams()[WORKBENCH_JOBS_PARAM_JOB] ?? ''

  // polling handled by WorkbenchJob which should update the cache
  const { data, loading } = useWorkbenchJobQuery({
    skip: !jobId,
    variables: { id: jobId },
  })
  const job = data?.workbenchJob
  const isLoading = loading && !job

  return (
    <SidePanelContent>
      <Flex
        direction="column"
        gap="medium"
        minWidth={500}
        flex={!!job?.result?.conclusion ? 8 : 3}
        height="100%"
        overflow="auto"
      >
        <WorkbenchJobPrs prs={job?.pullRequests?.filter(isNonNullable) ?? []} />
        <WorkbenchJobTriggerAlert alert={job?.alert} />
        <WorkbenchJobTriggerIssue issue={job?.issue} />
        <WorkbenchJobResult
          loading={isLoading}
          result={job?.result}
        />
        <WorkbenchJobTodos
          loading={isLoading}
          result={job?.result}
        />
      </Flex>
    </SidePanelContent>
  )
}

export function useWorkbenchJobPanel() {
  const { sidePanel, setSidePanel } = useTopLevelSidePanel()
  const isOpen = sidePanel === SIDE_PANEL_TYPE
  return {
    isOpen,
    setOpen: (open: boolean) => setSidePanel(open ? SIDE_PANEL_TYPE : null),
  }
}
