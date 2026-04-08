import { SidePanelContent } from 'components/ai/chatbot/SidePanelShared'
import {
  SidePanel,
  useTopLevelSidePanel,
} from 'components/layout/TopLevelSidePanel'
import { useParams } from 'react-router-dom'
import { WORKBENCH_JOBS_PARAM_JOB } from 'routes/workbenchesRoutesConsts'

const SIDE_PANEL_TYPE: SidePanel = 'workbench-job'

export function WorkbenchJobPanelContent() {
  const jobId = useParams()[WORKBENCH_JOBS_PARAM_JOB]
  return <SidePanelContent>TODO {jobId}</SidePanelContent>
}

export function useWorkbenchJobPanel() {
  const { sidePanel, setSidePanel } = useTopLevelSidePanel()
  const isOpen = sidePanel === SIDE_PANEL_TYPE
  return {
    isOpen,
    setOpen: (open: boolean) => setSidePanel(open ? SIDE_PANEL_TYPE : null),
  }
}
