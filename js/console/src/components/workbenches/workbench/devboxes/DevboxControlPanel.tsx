import {
  BrowserIcon,
  CloseIcon,
  FileDiffIcon,
  FolderIcon,
  GitPullIcon,
  IconFrame,
  TerminalIcon,
  Tooltip,
} from '@pluralsh/design-system'
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
  WORKBENCH_DEVBOX_INSTANCE_ABS_PATH,
  WORKBENCH_DEVBOX_FILE_QUERY_PARAM,
  WORKBENCH_DEVBOX_INSTANCE_PARAM_ID,
  WORKBENCH_DEVBOX_TAB_QUERY_PARAM,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { DevboxBrowserTab } from './DevboxBrowserTab'
import { DevboxDiffTab } from './DevboxDiffTab'
import { DevboxFilesTab } from './DevboxFilesTab'
import { isInstanceLive } from './devboxIdle'
import { DevboxRepositoriesTab } from './DevboxRepositoriesTab'
import { DevboxTerminalTab } from './DevboxTerminalTab'
import { useDevboxWorkspaceApi } from './devboxWorkspaceApi'

const SIDE_PANEL_TYPE: SidePanel = 'devbox'
const OPEN_KEY = 'plural-devbox-panel-open'

export type DevboxPanelTab =
  | 'files'
  | 'changes'
  | 'terminal'
  | 'browser'
  | 'repositories'

const PANEL_TABS: {
  key: DevboxPanelTab
  label: string
  icon: ReactElement
}[] = [
  { key: 'files', label: 'Files', icon: <FolderIcon size={14} /> },
  { key: 'changes', label: 'Changes', icon: <FileDiffIcon size={14} /> },
  { key: 'terminal', label: 'Terminal', icon: <TerminalIcon size={14} /> },
  { key: 'browser', label: 'Browser', icon: <BrowserIcon size={14} /> },
  {
    key: 'repositories',
    label: 'Repositories',
    icon: <GitPullIcon size={14} />,
  },
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
  const selectFile = (path: Nullable<string>) =>
    update({ [WORKBENCH_DEVBOX_FILE_QUERY_PARAM]: path })
  // a trailing `/` reveals a directory in the tree
  const openFile = (path: string) => {
    update({
      [WORKBENCH_DEVBOX_TAB_QUERY_PARAM]: null,
      [WORKBENCH_DEVBOX_FILE_QUERY_PARAM]: path,
    })
    setOpen(true)
  }

  return {
    isOpen: sidePanel === SIDE_PANEL_TYPE,
    setOpen,
    tab: isPanelTab(tabParam) ? tabParam : 'files',
    setTab,
    file: params.get(WORKBENCH_DEVBOX_FILE_QUERY_PARAM),
    selectFile,
    openFile,
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
  if (isOpen) return null
  return (
    <PanelRail
      tabs={panelTabsFor(instance)}
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
    openFile,
  } = useDevboxPanel()

  const [headerActions, setHeaderActions] =
    useState<Nullable<HTMLDivElement>>(null)

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
              api={api}
              live={live}
              onOpen={openFile}
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
          {active.key === 'repositories' && (
            <DevboxRepositoriesTab
              instance={instance}
              api={api}
              live={live}
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
  gap: theme.spacing.xxsmall,
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
