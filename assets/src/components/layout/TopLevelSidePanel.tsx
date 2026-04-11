import { Accordion, AccordionItem } from '@pluralsh/design-system'
import { AIContextProvider } from 'components/ai/AIContext'
import { ChatbotPanelContent } from 'components/ai/chatbot/Chatbot'
import { DragHandleSC } from 'components/ai/chatbot/SidePanelShared'
import { useResizablePane } from 'components/ai/chatbot/useResizeableChatPane'
import { WorkbenchJobPanelContent } from 'components/workbenches/workbench/job/WorkbenchJobPanel'
import {
  WebhookSetupGuidePanelContent,
  WebhookSetupGuidePanelProvider,
} from 'components/workbenches/workbench/webhooks/WebhookSetupGuidePanel'
import { ReactNode, createContext, use, useMemo, useState } from 'react'
import { matchPath, useLocation } from 'react-router-dom'
import {
  WORKBENCH_JOBS_PATH_MATCHER_ABS,
  WORKBENCH_WEBHOOK_TRIGGERS_PATH_MATCHER_ABS,
} from 'routes/workbenchesRoutesConsts'

export type SidePanel = 'ai-chat' | 'webhook-setup-guide' | 'workbench-job'

const MIN_WIDTH = 500
const MAX_WIDTH_VW = 40

const ALLOWED_ROUTES: Record<Exclude<SidePanel, 'ai-chat'>, string[]> = {
  'webhook-setup-guide': [WORKBENCH_WEBHOOK_TRIGGERS_PATH_MATCHER_ABS],
  'workbench-job': [WORKBENCH_JOBS_PATH_MATCHER_ABS],
}

const TopLevelSidePanelContext = createContext<{
  sidePanel: SidePanel | null
  setSidePanel: (panel: SidePanel | null) => void
}>({
  sidePanel: null,
  setSidePanel: () => {},
})

export function useTopLevelSidePanel() {
  return use(TopLevelSidePanelContext)
}

export function TopLevelSidePanel() {
  const { sidePanel } = useTopLevelSidePanel()
  const { calculatedPanelWidth, dragHandleProps, isDragging } =
    useResizablePane(MIN_WIDTH, MAX_WIDTH_VW)

  return (
    <Accordion
      type="single"
      value={`${sidePanel !== null}`}
      orientation="horizontal"
      css={{ border: 'none', zIndex: 1 }}
    >
      <AccordionItem
        value={`${true}`}
        caret="none"
        padding="none"
        trigger={null}
        css={{ height: '100%', width: '100%' }}
        additionalContentStyles={{ overflow: 'visible' }}
      >
        <div
          css={{ position: 'relative', height: '100%' }}
          style={{ '--side-panel-width': `${calculatedPanelWidth}px` }}
        >
          <TopLevelSidePanelContent sidePanel={sidePanel} />
          <DragHandleSC
            tabIndex={0}
            {...dragHandleProps}
            $isDragging={isDragging}
          />
        </div>
      </AccordionItem>
    </Accordion>
  )
}

function TopLevelSidePanelContent({
  sidePanel,
}: {
  sidePanel: SidePanel | null
}) {
  switch (sidePanel) {
    case 'webhook-setup-guide':
      return <WebhookSetupGuidePanelContent />
    case 'workbench-job':
      return <WorkbenchJobPanelContent />
    case 'ai-chat':
    default:
      return <ChatbotPanelContent />
  }
}

export function TopLevelSidePanelProviders({
  children,
}: {
  children: ReactNode
}) {
  return (
    <TopLevelSidePanelProvider>
      <AIContextProvider>
        <WebhookSetupGuidePanelProvider>
          {children}
        </WebhookSetupGuidePanelProvider>
      </AIContextProvider>
    </TopLevelSidePanelProvider>
  )
}

function TopLevelSidePanelProvider({ children }: { children: ReactNode }) {
  const [requested, setRequested] = useState<SidePanel | null>(null)
  const { pathname } = useLocation()

  const sidePanel: SidePanel | null = useMemo(() => {
    if (!requested || requested === 'ai-chat') return requested

    return ALLOWED_ROUTES[requested]?.some((pattern) =>
      matchPath(pattern, pathname)
    )
      ? requested
      : null
  }, [requested, pathname])

  const ctx = useMemo(
    () => ({ sidePanel, setSidePanel: setRequested }),
    [sidePanel]
  )

  return (
    <TopLevelSidePanelContext value={ctx}>{children}</TopLevelSidePanelContext>
  )
}
