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
import {
  ReactNode,
  createContext,
  use,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { matchPath, useLocation } from 'react-router-dom'
import {
  WORKBENCH_JOBS_PATH_MATCHER_ABS,
  WORKBENCH_TOOLS_ADD_PATH_MATCHER_ABS,
  WORKBENCH_TOOLS_YOUR_PATH_MATCHER_ABS,
  WORKBENCH_WEBHOOK_TRIGGERS_PATH_MATCHER_ABS,
} from 'routes/workbenchesRoutesConsts'

export type SidePanel = 'ai-chat' | 'webhook-setup-guide' | 'workbench-job'

type SidePanelWidthOverride = {
  minWidth?: number
  maxWidthVw?: number
  initialWidthVw?: number
}

export const DEFAULT_MIN_WIDTH = 500
export const DEFAULT_MAX_WIDTH_VW = 40

const ALLOWED_ROUTES: Record<Exclude<SidePanel, 'ai-chat'>, string[]> = {
  'webhook-setup-guide': [
    WORKBENCH_WEBHOOK_TRIGGERS_PATH_MATCHER_ABS,
    WORKBENCH_TOOLS_ADD_PATH_MATCHER_ABS,
    WORKBENCH_TOOLS_YOUR_PATH_MATCHER_ABS,
  ],
  'workbench-job': [WORKBENCH_JOBS_PATH_MATCHER_ABS],
}

const TopLevelSidePanelContext = createContext<{
  sidePanel: SidePanel | null
  setSidePanel: (panel: SidePanel | null) => void
  widthOverride: SidePanelWidthOverride | null
  setWidthOverride: (override: SidePanelWidthOverride | null) => void
}>({
  sidePanel: null,
  setSidePanel: () => {},
  widthOverride: null,
  setWidthOverride: () => {},
})

export function useTopLevelSidePanel() {
  return use(TopLevelSidePanelContext)
}

// only one instance of this should be called at a time
// removes override when caller is unmounted
export function useSidePanelWidth(override: SidePanelWidthOverride | null) {
  const { setWidthOverride } = useTopLevelSidePanel()
  const { minWidth, maxWidthVw, initialWidthVw } = override ?? {}
  const hasOverride = !!override
  useEffect(() => {
    if (!hasOverride) return
    setWidthOverride({ minWidth, maxWidthVw, initialWidthVw })
    return () => setWidthOverride(null)
  }, [setWidthOverride, hasOverride, minWidth, maxWidthVw, initialWidthVw])
}

export function TopLevelSidePanel() {
  const { sidePanel, widthOverride } = useTopLevelSidePanel()
  const { calculatedPanelWidth, dragHandleProps, isDragging } =
    useResizablePane(
      widthOverride?.minWidth ?? DEFAULT_MIN_WIDTH,
      widthOverride?.maxWidthVw ?? DEFAULT_MAX_WIDTH_VW,
      widthOverride?.initialWidthVw
    )

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
          style={{
            '--side-panel-width': `${calculatedPanelWidth}px`,
            '--is-dragging': isDragging ? '1' : '0',
          }}
        >
          <TopLevelSidePanelContent sidePanel={sidePanel} />
          <DragHandleSC
            tabIndex={0}
            {...dragHandleProps}
            style={{ '--is-dragging': isDragging ? '1' : '0' }}
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
  const [widthOverride, setWidthOverride] =
    useState<SidePanelWidthOverride | null>(null)
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
    () => ({
      sidePanel,
      setSidePanel: setRequested,
      widthOverride,
      setWidthOverride,
    }),
    [sidePanel, widthOverride]
  )

  return (
    <TopLevelSidePanelContext value={ctx}>{children}</TopLevelSidePanelContext>
  )
}
