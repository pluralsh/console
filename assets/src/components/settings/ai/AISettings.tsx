import { Outlet, useMatch } from 'react-router-dom'

import { useMemo, useRef } from 'react'

import {
  AI_SETTINGS_ABS_PATH,
  AI_SETTINGS_AI_PROVIDER_REL_PATH,
} from 'routes/settingsRoutesConst'

import { SubTab, TabList, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import { LinkTabWrap } from 'components/utils/Tabs'

import { SETTINGS_BREADCRUMBS } from '../Settings'

export const getAISettingsBreadcrumbs = (tab: string) => [
  ...SETTINGS_BREADCRUMBS,
  { label: 'ai', url: AI_SETTINGS_ABS_PATH },
  { label: tab, url: getAISettingsAbsPath(tab) },
]

const directory = [
  { path: AI_SETTINGS_AI_PROVIDER_REL_PATH, label: 'AI providers' },
  { path: 'agent-runtimes', label: 'Agent runtimes' },
  { path: 'mcp-servers', label: 'MCP servers' },
]

export function AISettings() {
  const tabStateRef = useRef<any>(null)
  const tab = useMatch(`${AI_SETTINGS_ABS_PATH}/:tab`)?.params.tab ?? ''

  useSetBreadcrumbs(useMemo(() => getAISettingsBreadcrumbs(tab ?? ''), [tab]))
  useSetPageHeaderContent(
    <TabList
      scrollable
      stateRef={tabStateRef}
      stateProps={{ selectedKey: tab }}
    >
      {directory.map(({ label, path }) => (
        <LinkTabWrap
          subTab
          key={path}
          textValue={label}
          to={getAISettingsAbsPath(path)}
        >
          <SubTab
            key={path}
            textValue={label}
          >
            {label}
          </SubTab>
        </LinkTabWrap>
      ))}
    </TabList>
  )

  return <Outlet />
}

const getAISettingsAbsPath = (tab: string) => `${AI_SETTINGS_ABS_PATH}/${tab}`
