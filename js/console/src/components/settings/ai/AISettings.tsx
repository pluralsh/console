import { Outlet, useMatch } from 'react-router-dom'

import { Suspense, useMemo, useRef } from 'react'
import { useDeploymentSettingsSuspenseQuery } from 'generated/graphql'

import {
  AI_SETTINGS_ABS_PATH,
  AI_SETTINGS_AGENT_RUNTIMES_REL_PATH,
  AI_SETTINGS_AI_INSIGHTS_REL_PATH,
  AI_SETTINGS_AI_PROVIDER_REL_PATH,
  AI_SETTINGS_MCP_SERVERS_REL_PATH,
  AI_SETTINGS_MODEL_ROUTING_REL_PATH,
} from 'routes/settingsRoutesConst'

import { SubTab, TabList, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import { LinkTabWrap } from 'components/utils/Tabs'

import { SETTINGS_BREADCRUMBS } from '../Settings'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'

export const getAISettingsBreadcrumbs = (tab: string) => [
  ...SETTINGS_BREADCRUMBS,
  { label: 'ai', url: AI_SETTINGS_ABS_PATH },
  { label: tab, url: getAISettingsAbsPath(tab) },
]

const directory = [
  { path: AI_SETTINGS_AI_PROVIDER_REL_PATH, label: 'AI providers' },
  {
    path: AI_SETTINGS_MODEL_ROUTING_REL_PATH,
    label: 'Model routing',
    requiresAi: true,
  },
  {
    path: AI_SETTINGS_AI_INSIGHTS_REL_PATH,
    label: 'AI insights',
    requiresAi: true,
  },
  { path: AI_SETTINGS_AGENT_RUNTIMES_REL_PATH, label: 'Agent runtimes' },
  { path: AI_SETTINGS_MCP_SERVERS_REL_PATH, label: 'MCP servers' },
]

export function AISettings() {
  const tabStateRef = useRef<any>(null)
  const tab = useMatch(`${AI_SETTINGS_ABS_PATH}/:tab`)?.params.tab ?? ''
  const { data: deploymentSettings } = useDeploymentSettingsSuspenseQuery()
  const aiEnabled = deploymentSettings.deploymentSettings?.ai?.enabled ?? false

  useSetBreadcrumbs(useMemo(() => getAISettingsBreadcrumbs(tab ?? ''), [tab]))
  useSetPageHeaderContent(
    <TabList
      scrollable
      stateRef={tabStateRef}
      stateProps={{ selectedKey: tab }}
    >
      {directory.map(({ label, path, requiresAi }) => {
        const disabled = !!requiresAi && !aiEnabled

        if (disabled) {
          return (
            <SubTab
              key={path}
              disabled
              textValue={label}
            >
              {label}
            </SubTab>
          )
        }

        return (
          <LinkTabWrap
            subTab
            key={path}
            textValue={label}
            to={getAISettingsAbsPath(path)}
          >
            <SubTab textValue={label}>{label}</SubTab>
          </LinkTabWrap>
        )
      })}
    </TabList>
  )

  return (
    <Suspense
      fallback={
        <RectangleSkeleton
          $height="100%"
          $width="100%"
        />
      }
    >
      <Outlet />
    </Suspense>
  )
}

const getAISettingsAbsPath = (tab: string) => `${AI_SETTINGS_ABS_PATH}/${tab}`
