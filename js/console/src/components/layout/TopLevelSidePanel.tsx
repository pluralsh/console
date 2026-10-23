import { Accordion, AccordionItem } from '@pluralsh/design-system'
import { AIContextProvider } from 'components/ai/AIContext'
import { ChatbotPanelContent } from 'components/ai/chatbot/Chatbot'
import { DragHandleSC } from 'components/ai/chatbot/SidePanelShared'
import { useResizablePane } from 'components/ai/chatbot/useResizeableChatPane'
import {
  AgentRunPanelContent,
  AgentRunPanelProvider,
} from 'components/ai/agent-runs/details/AgentRunPanel'
import { WorkbenchJobPanelContent } from 'components/workbenches/workbench/job/WorkbenchJobPanel'
import {
  WebhookSetupGuidePanelContent,
  WebhookSetupGuidePanelProvider,
} from 'components/workbenches/workbench/webhooks/WebhookSetupGuidePanel'
import { ReactNode, use } from 'react'
import {
  SIDEBAR_EXPANDED_WIDTH,
  SIDEBAR_WIDTH,
  SidebarContext,
} from './Sidebar'
import styled from 'styled-components'
import {
  SidePanel,
  TopLevelSidePanelProvider,
  useTopLevelSidePanel,
} from './TopLevelSidePanelState'

export {
  type SidePanel,
  type SidePanelAutoOpen,
  type SidePanelWidthOverride,
  useSidePanelAutoOpen,
  useSidePanelWidth,
  useTopLevelSidePanel,
} from './TopLevelSidePanelState'

export const DEFAULT_MIN_WIDTH = 500
export const DEFAULT_MAX_WIDTH_VW = 40
const SIDE_PANEL_WIDTH_TRANSITION = '0.3s ease-in-out'

export function TopLevelSidePanel() {
  const { sidePanel, widthOverride } = useTopLevelSidePanel()
  const { isExpanded } = use(SidebarContext)
  const sidebarWidth = isExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_WIDTH
  const { calculatedPanelWidth, dragHandleProps, isDragging } =
    useResizablePane(
      widthOverride?.minWidth ?? DEFAULT_MIN_WIDTH,
      widthOverride?.maxWidthVw ?? DEFAULT_MAX_WIDTH_VW,
      widthOverride?.initialWidthVw
    )
  const fullWidth = !!widthOverride?.fullWidth
  const panelWidth = fullWidth
    ? `calc(100vw - ${sidebarWidth}px)`
    : `${calculatedPanelWidth}px`

  return (
    <Accordion
      type="single"
      value={`${sidePanel !== null}`}
      orientation="horizontal"
      css={{ border: 'none', height: '100%', zIndex: 1 }}
    >
      <AccordionItem
        value={`${true}`}
        caret="none"
        padding="none"
        trigger={null}
        css={{ height: '100%', width: 'auto' }}
        additionalContentStyles={{ height: '100%', overflow: 'visible' }}
      >
        <SidePanelWidthSC
          style={{
            '--side-panel-width': panelWidth,
            '--is-dragging': isDragging ? '1' : '0',
          }}
        >
          <TopLevelSidePanelContent sidePanel={sidePanel} />
          {!fullWidth && (
            <DragHandleSC
              tabIndex={0}
              $isDragging={isDragging}
              {...dragHandleProps}
            />
          )}
        </SidePanelWidthSC>
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
    case 'agent-run':
      return <AgentRunPanelContent />
    case 'ai-chat':
      return <ChatbotPanelContent />
    default:
      return null
  }
}

export function TopLevelSidePanelProviders({
  children,
}: {
  children: ReactNode
}) {
  return (
    <TopLevelSidePanelProvider>
      <AgentRunPanelProvider>
        <AIContextProvider>
          <WebhookSetupGuidePanelProvider>
            {children}
          </WebhookSetupGuidePanelProvider>
        </AIContextProvider>
      </AgentRunPanelProvider>
    </TopLevelSidePanelProvider>
  )
}

const SidePanelWidthSC = styled.div({
  position: 'relative',
  height: '100%',
  width: 'var(--side-panel-width)',
  flexShrink: 0,
  overflow: 'hidden',
  transition: `width calc((1 - var(--is-dragging)) * ${SIDE_PANEL_WIDTH_TRANSITION}) ease-in-out`,
})
