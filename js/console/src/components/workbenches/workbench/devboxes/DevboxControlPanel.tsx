import {
  MonitorIcon,
  CloseIcon,
  GitCompareIcon,
  FolderIcon,
  IconFrame,
  PrIcon,
  TerminalIcon,
  Tooltip,
} from '@pluralsh/design-system'
import { CountBadge } from 'components/utils/CountBadge'
import {
  PanelHeaderSC,
  SidePanelContent,
} from 'components/ai/chatbot/SidePanelShared'
import { PanelRail } from 'components/layout/PanelRail'
import {
  SidePanel,
  useTopLevelSidePanel,
} from 'components/layout/TopLevelSidePanelState'
import {
  DevboxInstanceFragment,
  useDevboxInstanceQuery,
} from 'generated/graphql'
import { ReactElement, useCallback, useEffect, useState } from 'react'
import { matchPath, useLocation, useSearchParams } from 'react-router-dom'
import {
  WORKBENCH_DEVBOX_CHANGE_QUERY_PARAM,
  WORKBENCH_DEVBOX_INSTANCE_ABS_PATH,
  WORKBENCH_DEVBOX_FILE_QUERY_PARAM,
  WORKBENCH_DEVBOX_INSTANCE_PARAM_ID,
  WORKBENCH_DEVBOX_TAB_QUERY_PARAM,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { DevboxBrowserTab } from './DevboxBrowserTab'
import { useDevboxChangeStat } from './devboxChanges'
import {
  DevboxDiffBlock,
  DevboxDiffStat,
  diffStatLabel,
} from './DevboxDiffStat'
import { DevboxDiffTab } from './DevboxDiffTab'
import { DevboxFilesTab } from './DevboxFilesTab'
import { isInstanceLive } from './devboxIdle'
import { useDevboxPullRequests } from './devboxPullRequests'
import { DevboxPullRequestsTab } from './DevboxPullRequestsTab'
import { DevboxTerminalTab } from './DevboxTerminalTab'
import { useDevboxWorkspaceApi } from './devboxWorkspaceApi'

const SIDE_PANEL_TYPE: SidePanel = 'devbox'
const OPEN_KEY = 'plural-devbox-panel-open'

export type DevboxPanelTab =
  | 'files'
  | 'changes'
  | 'prs'
  | 'terminal'
  | 'browser'

const PANEL_TABS: {
  key: DevboxPanelTab
  label: string
  icon: ReactElement
}[] = [
  { key: 'files', label: 'Files', icon: <FolderIcon size={14} /> },
  { key: 'changes', label: 'Changes', icon: <GitCompareIcon size={14} /> },
  { key: 'prs', label: 'Pull requests', icon: <PrIcon size={14} /> },
  { key: 'terminal', label: 'Terminal', icon: <TerminalIcon size={14} /> },
  { key: 'browser', label: 'Browser', icon: <MonitorIcon size={14} /> },
]

export const isPanelTab = (tab: Nullable<string>): tab is DevboxPanelTab =>
  PANEL_TABS.some((t) => t.key === tab)

const panelTabsFor = (instance: Nullable<DevboxInstanceFragment>) =>
  PANEL_TABS.filter((t) => t.key !== 'browser' || instance?.devbox?.browser)

const readOpen = () => localStorage.getItem(OPEN_KEY) !== 'false'

// the panel lives in the app's top-level side panel, beside the header, and
// remembers whether it was left open across instances
export function useDevboxPanel() {
  const { sidePanel, setSidePanel, closeSidePanel } = useTopLevelSidePanel()
  const [params, setParams] = useSearchParams()
  const tabParam = params.get(WORKBENCH_DEVBOX_TAB_QUERY_PARAM)

  const setOpen = useCallback(
    (open: boolean) => {
      localStorage.setItem(OPEN_KEY, `${open}`)
      if (open) setSidePanel(SIDE_PANEL_TYPE)
      else closeSidePanel(SIDE_PANEL_TYPE)
    },
    [setSidePanel, closeSidePanel]
  )
  const update = (changes: Record<string, Nullable<string>>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(changes))
          if (value) next.set(key, value)
          else next.delete(key)
        return next
      },
      { replace: true }
    )
  const setTab = (tab: DevboxPanelTab) =>
    update({ [WORKBENCH_DEVBOX_TAB_QUERY_PARAM]: tab === 'files' ? null : tab })
  // the main view shows at most one of an open file or a change's diff
  const selectFile = (path: Nullable<string>) =>
    update({
      [WORKBENCH_DEVBOX_FILE_QUERY_PARAM]: path,
      [WORKBENCH_DEVBOX_CHANGE_QUERY_PARAM]: null,
    })
  const selectChange = (change: Nullable<string>) =>
    update({
      [WORKBENCH_DEVBOX_CHANGE_QUERY_PARAM]: change,
      [WORKBENCH_DEVBOX_FILE_QUERY_PARAM]: null,
    })
  // a trailing `/` only reveals a directory in the tree, a file also replaces
  // the instance's main view with the file
  const openFile = (path: string) => {
    update({
      [WORKBENCH_DEVBOX_TAB_QUERY_PARAM]: null,
      [WORKBENCH_DEVBOX_FILE_QUERY_PARAM]: path,
      [WORKBENCH_DEVBOX_CHANGE_QUERY_PARAM]: null,
    })
    setOpen(true)
  }

  const file = params.get(WORKBENCH_DEVBOX_FILE_QUERY_PARAM)
  const change = params.get(WORKBENCH_DEVBOX_CHANGE_QUERY_PARAM)

  return {
    isOpen: sidePanel === SIDE_PANEL_TYPE,
    setOpen,
    tab: isPanelTab(tabParam) ? tabParam : 'files',
    setTab,
    file,
    viewedFile: file && !file.endsWith('/') ? file : null,
    selectFile,
    openFile,
    change,
    selectChange,
  }
}

// opens the panel on the instance page if it was left open, closing it on leave
export function useDevboxPanelAutoOpen(instanceId: string) {
  const { setSidePanel, closeSidePanel } = useTopLevelSidePanel()
  useEffect(() => {
    if (readOpen()) setSidePanel(SIDE_PANEL_TYPE)
    return () => closeSidePanel(SIDE_PANEL_TYPE)
  }, [instanceId, setSidePanel, closeSidePanel])
}

export function DevboxPanelRail({
  instance,
}: {
  instance: DevboxInstanceFragment
}) {
  const { isOpen, setOpen, setTab } = useDevboxPanel()
  const changes = useDevboxChangeStat(
    isOpen ? null : instance.id,
    isInstanceLive(instance.status)
  )
  const { open } = useDevboxPullRequests(instance.id)
  if (isOpen) return null
  return (
    <PanelRail
      tabs={panelTabsFor(instance).map((t) => {
        if (t.key === 'changes' && changes.files)
          return {
            ...t,
            label: `${t.label}: ${diffStatLabel(changes)}`,
            badge: <DevboxDiffBlock stat={changes} />,
          }
        if (t.key === 'prs' && open.length)
          return {
            ...t,
            label: `${t.label}: ${open.length} open`,
            count: open.length,
          }
        return t
      })}
      onOpen={(tab) => {
        setTab(tab)
        setOpen(true)
      }}
    />
  )
}

export function DevboxPanelContent() {
  // the panel renders outside the instance's route, so useParams can't see it
  const { pathname } = useLocation()
  const instanceId =
    matchPath(WORKBENCH_DEVBOX_INSTANCE_ABS_PATH, pathname)?.params[
      WORKBENCH_DEVBOX_INSTANCE_PARAM_ID
    ] ?? ''
  const { data } = useDevboxInstanceQuery({
    variables: { id: instanceId },
    skip: !instanceId,
    fetchPolicy: 'cache-first',
  })
  const instance = data?.devboxInstance
  const api = useDevboxWorkspaceApi(instanceId || null)
  const live = isInstanceLive(instance?.status)
  const {
    setOpen,
    tab,
    setTab,
    file: filePath,
    selectFile,
    change,
    selectChange,
  } = useDevboxPanel()

  const [headerActions, setHeaderActions] =
    useState<Nullable<HTMLDivElement>>(null)

  const changes = useDevboxChangeStat(instanceId || null, live)
  const { open: openPrs } = useDevboxPullRequests(instanceId || null)
  const tabs = panelTabsFor(instance)
  const active = tabs.find((t) => t.key === tab) ?? tabs[0]

  return (
    <SidePanelContent>
      <PanelHeaderSC>
        <TabStripSC role="tablist">
          {tabs.map((t) => {
            const selected = t.key === active.key
            const button = (
              <TabSC
                key={t.key}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-label={t.label}
                $selected={selected}
                onClick={() => setTab(t.key)}
              >
                {t.icon}
                {selected && <span>{t.label}</span>}
                {t.key === 'changes' && <DevboxDiffStat stat={changes} />}
                {t.key === 'prs' && (
                  <CountBadge
                    count={openPrs.length}
                    size="small"
                    variant="warning"
                  />
                )}
              </TabSC>
            )
            return selected ? (
              button
            ) : (
              <Tooltip
                key={t.key}
                label={t.label}
                placement="bottom"
              >
                {button}
              </Tooltip>
            )
          })}
        </TabStripSC>
        <HeaderActionsSC ref={setHeaderActions} />
        <IconFrame
          clickable
          css={{ flexShrink: 0 }}
          icon={<CloseIcon />}
          onClick={() => setOpen(false)}
          tooltip="Close panel"
        />
      </PanelHeaderSC>
      {instance && (
        <PanelBodySC
          $flush={active.key === 'changes' || active.key === 'files'}
        >
          {active.key === 'files' && (
            <DevboxFilesTab
              api={api}
              live={live}
              selected={filePath}
              onSelect={selectFile}
            />
          )}
          {active.key === 'changes' && (
            <DevboxDiffTab
              instanceId={instanceId}
              live={live}
              selected={change}
              onSelect={selectChange}
              headerActions={headerActions}
            />
          )}
          {active.key === 'prs' && (
            <DevboxPullRequestsTab
              instance={instance}
              live={live}
              headerActions={headerActions}
            />
          )}
          {active.key === 'terminal' && (
            <DevboxTerminalTab
              api={api}
              live={live}
              headerActions={headerActions}
            />
          )}
          {active.key === 'browser' && (
            <DevboxBrowserTab
              api={api}
              live={live}
              browserEnabled={!!instance.devbox?.browser}
            />
          )}
        </PanelBodySC>
      )}
    </SidePanelContent>
  )
}

const TabStripSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  flex: 1,
  minWidth: 0,
  overflowX: 'auto',
}))

// matches the job panel's sub-tabs; only the selected one carries its name
const TabSC = styled.button<{ $selected: boolean }>(({ theme, $selected }) => {
  const selectedFill =
    theme.mode === 'light'
      ? theme.colors.grey[50]
      : theme.colors['fill-one-selected']
  return {
    ...theme.partials.reset.button,
    ...theme.partials.text.caption,
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing.xsmall,
    flexShrink: 0,
    height: 28,
    minWidth: 28,
    justifyContent: 'center',
    padding: `0 ${$selected ? theme.spacing.small : 0}`,
    borderRadius: theme.borderRadiuses.medium,
    cursor: 'pointer',
    color: $selected ? theme.colors.text : theme.colors['icon-light'],
    backgroundColor: $selected ? selectedFill : 'transparent',
    boxShadow: $selected
      ? `inset 0 0 0 ${theme.borderWidths.default}px ${theme.colors.border}`
      : 'none',
    '&:hover': {
      backgroundColor: $selected
        ? selectedFill
        : theme.colors['fill-zero-hover'],
    },
    '&:focus-visible': { outline: theme.borders['outline-focused'] },
  }
})

const HeaderActionsSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  flexShrink: 0,
  '&:empty': { display: 'none' },
}))

const PanelBodySC = styled.div<{ $flush: boolean }>(({ theme, $flush }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: $flush ? 0 : theme.spacing.medium,
}))
