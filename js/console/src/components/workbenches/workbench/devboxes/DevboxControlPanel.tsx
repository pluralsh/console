import {
  BrowserIcon,
  FileDiffIcon,
  FolderIcon,
  GitPullIcon,
  SidePanelOpenIcon,
  TerminalIcon,
} from '@pluralsh/design-system'
import usePersistedState from 'components/hooks/usePersistedState'
import { PanelRail, PanelRailButton } from 'components/layout/PanelRail'
import { DevboxInstanceFragment } from 'generated/graphql'
import {
  PointerEvent as ReactPointerEvent,
  ReactElement,
  useRef,
  useState,
} from 'react'
import styled from 'styled-components'
import { DevboxBrowserTab } from './DevboxBrowserTab'
import { DevboxDiffTab } from './DevboxDiffTab'
import { DevboxFilesTab } from './DevboxFilesTab'
import { DevboxRepositoriesTab } from './DevboxRepositoriesTab'
import { DevboxTerminalTab } from './DevboxTerminalTab'
import { DevboxWorkspaceApi } from './devboxWorkspaceApi'

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
  { key: 'files', label: 'Files', icon: <FolderIcon /> },
  { key: 'changes', label: 'Changes', icon: <FileDiffIcon /> },
  { key: 'terminal', label: 'Terminal', icon: <TerminalIcon /> },
  { key: 'browser', label: 'Browser', icon: <BrowserIcon /> },
  { key: 'repositories', label: 'Repositories', icon: <GitPullIcon /> },
]

const MIN_WIDTH = 360
const DEFAULT_WIDTH = 600

export const isPanelTab = (tab: Nullable<string>): tab is DevboxPanelTab =>
  PANEL_TABS.some((t) => t.key === tab)

export function useDevboxPanelOpen() {
  return usePersistedState('plural-devbox-panel-open', true)
}

export function DevboxControlPanel({
  instance,
  api,
  live,
  tab,
  onTabChange,
  open,
  onOpenChange,
}: {
  instance: DevboxInstanceFragment
  api: DevboxWorkspaceApi
  live: boolean
  tab: DevboxPanelTab
  onTabChange: (tab: DevboxPanelTab) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [width, setWidth] = usePersistedState(
    'plural-devbox-panel-width',
    DEFAULT_WIDTH,
    300
  )
  // kept here so the open file survives switching tabs
  const [filePath, setFilePath] = useState<Nullable<string>>(null)
  const drag = useRef<Nullable<{ x: number; width: number }>>(null)
  const tabs = PANEL_TABS.filter(
    (t) => t.key !== 'browser' || instance.devbox?.browser
  )
  const active = tabs.find((t) => t.key === tab) ?? tabs[0]
  const openTab = (key: DevboxPanelTab) => {
    onTabChange(key)
    onOpenChange(true)
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, width }
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    const max = Math.max(MIN_WIDTH, window.innerWidth * 0.7)
    const next = drag.current.width + drag.current.x - e.clientX
    setWidth(Math.round(Math.min(max, Math.max(MIN_WIDTH, next))))
  }

  if (!open)
    return (
      <PanelRail
        tabs={tabs}
        onOpen={openTab}
      />
    )

  return (
    <PanelSC style={{ width }}>
      <HandleSC
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
      />
      <PanelHeaderSC>
        {tabs.map((t) => (
          <PanelRailButton
            key={t.key}
            label={t.label}
            active={t.key === active.key}
            onClick={() => openTab(t.key)}
          >
            {t.icon}
          </PanelRailButton>
        ))}
        <PanelTitleSC>{active.label}</PanelTitleSC>
        <PanelRailButton
          label="Collapse panel"
          onClick={() => onOpenChange(false)}
        >
          <SidePanelOpenIcon css={{ transform: 'scaleX(-1)' }} />
        </PanelRailButton>
      </PanelHeaderSC>
      <PanelBodySC $flush={active.key === 'changes'}>
        {active.key === 'files' && (
          <DevboxFilesTab
            api={api}
            live={live}
            selected={filePath}
            onSelect={setFilePath}
          />
        )}
        {active.key === 'changes' && (
          <DevboxDiffTab
            api={api}
            live={live}
            onOpen={(path) => {
              setFilePath(path)
              onTabChange('files')
            }}
          />
        )}
        {active.key === 'terminal' && (
          <DevboxTerminalTab
            api={api}
            live={live}
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
    </PanelSC>
  )
}

const PanelSC = styled.div(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  minWidth: MIN_WIDTH,
  maxWidth: '70%',
  height: '100%',
  minHeight: 0,
  borderLeft: theme.borders.default,
  backgroundColor: theme.colors['fill-accent'],
}))

const HandleSC = styled.div(({ theme }) => ({
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: -3,
  width: 6,
  cursor: 'col-resize',
  zIndex: 1,
  '&:hover, &:active': { backgroundColor: theme.colors['border-primary'] },
}))

const PanelHeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xxsmall,
  flexShrink: 0,
  padding: `${theme.spacing.small} ${theme.spacing.medium}`,
  borderBottom: theme.borders.default,
}))

const PanelTitleSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  flex: 1,
  marginLeft: theme.spacing.xsmall,
  color: theme.colors['text-xlight'],
}))

const PanelBodySC = styled.div<{ $flush: boolean }>(({ theme, $flush }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: $flush ? 0 : theme.spacing.medium,
}))
