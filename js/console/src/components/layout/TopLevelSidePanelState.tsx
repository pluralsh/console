import { useLegacyAiChatEnabled } from 'components/ai/useLegacyAiChatEnabled'
import {
  ReactNode,
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { matchPath, useLocation } from 'react-router-dom'
import {
  AI_SETTINGS_MCP_SERVERS_EDIT_PATH_MATCHER_ABS,
  CHATBOTS_SETTINGS_CREATE_ABS_PATH,
  CHATBOTS_SETTINGS_EDIT_PATH_MATCHER_ABS,
  CLOUD_CONNECTIONS_SETTINGS_CREATE_ABS_PATH,
  CLOUD_CONNECTIONS_SETTINGS_EDIT_PATH_MATCHER_ABS,
  WEBHOOKS_SETTINGS_CREATE_ABS_PATH,
  WEBHOOKS_SETTINGS_EDIT_PATH_MATCHER_ABS,
} from 'routes/settingsRoutesConst'
import { AI_AGENT_RUNS_PATH_MATCHER_ABS } from 'routes/aiRoutesConsts'
import {
  WORKBENCH_CHATBOTS_PATH_MATCHER_ABS,
  WORKBENCH_JOBS_PATH_MATCHER_ABS,
  WORKBENCH_TOOLS_ADD_PATH_MATCHER_ABS,
  WORKBENCH_TOOLS_YOUR_PATH_MATCHER_ABS,
  WORKBENCH_WEBHOOK_TRIGGERS_PATH_MATCHER_ABS,
} from 'routes/workbenchesRoutesConsts'

export type SidePanel =
  | 'agent-run'
  | 'ai-chat'
  | 'webhook-setup-guide'
  | 'workbench-job'

export type SidePanelWidthOverride = {
  minWidth?: number
  maxWidthVw?: number
  initialWidthVw?: number
  fullWidth?: boolean
}

const ALLOWED_ROUTES: Record<Exclude<SidePanel, 'ai-chat'>, string[]> = {
  'webhook-setup-guide': [
    WORKBENCH_WEBHOOK_TRIGGERS_PATH_MATCHER_ABS,
    WORKBENCH_CHATBOTS_PATH_MATCHER_ABS,
    WORKBENCH_TOOLS_ADD_PATH_MATCHER_ABS,
    WORKBENCH_TOOLS_YOUR_PATH_MATCHER_ABS,
    WEBHOOKS_SETTINGS_CREATE_ABS_PATH,
    WEBHOOKS_SETTINGS_EDIT_PATH_MATCHER_ABS,
    CHATBOTS_SETTINGS_CREATE_ABS_PATH,
    CHATBOTS_SETTINGS_EDIT_PATH_MATCHER_ABS,
    `${CHATBOTS_SETTINGS_EDIT_PATH_MATCHER_ABS}/*`,
    CLOUD_CONNECTIONS_SETTINGS_CREATE_ABS_PATH,
    CLOUD_CONNECTIONS_SETTINGS_EDIT_PATH_MATCHER_ABS,
    AI_SETTINGS_MCP_SERVERS_EDIT_PATH_MATCHER_ABS,
  ],
  'workbench-job': [WORKBENCH_JOBS_PATH_MATCHER_ABS],
  'agent-run': [AI_AGENT_RUNS_PATH_MATCHER_ABS],
}

function isAllowed(
  panel: SidePanel | null,
  pathname: string,
  legacyChatEnabled: boolean
): boolean {
  if (!panel) return false
  if (panel === 'ai-chat') return legacyChatEnabled

  return ALLOWED_ROUTES[panel].some((pattern) => matchPath(pattern, pathname))
}

type TopLevelSidePanelContextT = {
  sidePanel: SidePanel | null
  setSidePanel: (panel: SidePanel | null) => void
  // closes `panel` only if it's the one currently requested
  closeSidePanel: (panel: SidePanel) => void
  widthOverride: SidePanelWidthOverride | null
  setWidthOverride: (override: SidePanelWidthOverride | null) => void
}

const TopLevelSidePanelContext = createContext<TopLevelSidePanelContextT>({
  sidePanel: null,
  setSidePanel: () => {},
  closeSidePanel: () => {},
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
  const { minWidth, maxWidthVw, initialWidthVw, fullWidth } = override ?? {}
  const hasOverride = !!override
  useEffect(() => {
    if (!hasOverride) return
    setWidthOverride({ minWidth, maxWidthVw, initialWidthVw, fullWidth })
    return () => setWidthOverride(null)
  }, [
    setWidthOverride,
    hasOverride,
    minWidth,
    maxWidthVw,
    initialWidthVw,
    fullWidth,
  ])
}

export type SidePanelAutoOpen = {
  hasContent: boolean
  loading?: boolean
  // e.g. the job or run id, so moving between entities re-evaluates
  key?: Nullable<string>
}

// Opens `panel` whenever the page has content for it, closes it only once the
// page has loaded with nothing to display, and closes it on unmount. It only
// re-evaluates when the content state or key changes, so a manual close sticks
// until there's something new to show.
export function useSidePanelAutoOpen(
  panel: SidePanel,
  autoOpen: Nullable<SidePanelAutoOpen>
) {
  const { setSidePanel, closeSidePanel } = useTopLevelSidePanel()
  const managed = !!autoOpen
  const hasContent = !!autoOpen?.hasContent
  const loading = !!autoOpen?.loading
  const key = autoOpen?.key

  useEffect(() => {
    if (!managed || loading) return
    if (hasContent) setSidePanel(panel)
    else closeSidePanel(panel)
  }, [managed, loading, hasContent, key, panel, setSidePanel, closeSidePanel])

  useEffect(() => {
    if (!managed) return
    return () => closeSidePanel(panel)
  }, [managed, panel, closeSidePanel])
}

export function TopLevelSidePanelProvider({
  children,
}: {
  children: ReactNode
}) {
  const [requested, setRequested] = useState<SidePanel | null>(null)
  const [widthOverride, setWidthOverride] =
    useState<SidePanelWidthOverride | null>(null)
  const { pathname } = useLocation()
  const legacyChatEnabled = useLegacyAiChatEnabled()

  const sidePanel = isAllowed(requested, pathname, legacyChatEnabled)
    ? requested
    : null

  // Drop the request once it's no longer allowed here. This runs during render,
  // before a newly mounted page's effects can request its own panel, so that
  // request is never clobbered by the previous route's panel.
  if (requested && !sidePanel) setRequested(null)

  const closeSidePanel = useCallback(
    (panel: SidePanel) =>
      setRequested((current) => (current === panel ? null : current)),
    []
  )

  const ctx = useMemo(
    () => ({
      sidePanel,
      setSidePanel: setRequested,
      closeSidePanel,
      widthOverride,
      setWidthOverride,
    }),
    [sidePanel, closeSidePanel, widthOverride]
  )

  return (
    <TopLevelSidePanelContext value={ctx}>{children}</TopLevelSidePanelContext>
  )
}
