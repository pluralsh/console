import { Outlet, useMatch } from 'react-router-dom'

import { Suspense, useMemo } from 'react'
import { useDeploymentSettingsSuspenseQuery } from 'generated/graphql'

import {
  AI_SETTINGS_ABS_PATH,
  AI_SETTINGS_AGENT_RUNTIMES_REL_PATH,
  AI_SETTINGS_AI_INSIGHTS_REL_PATH,
  AI_SETTINGS_AI_PROVIDER_REL_PATH,
  AI_SETTINGS_MCP_SERVERS_REL_PATH,
  AI_SETTINGS_MODEL_ROUTING_REL_PATH,
} from 'routes/settingsRoutesConst'

import { useSetBreadcrumbs } from '@pluralsh/design-system'

import { SETTINGS_BREADCRUMBS, SettingsToolbarTabs } from '../Settings'
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
  const tab = useMatch(`${AI_SETTINGS_ABS_PATH}/:tab`)?.params.tab ?? ''
  const { data: deploymentSettings } = useDeploymentSettingsSuspenseQuery()
  const aiEnabled = deploymentSettings.deploymentSettings?.ai?.enabled ?? false

  const tabs = useMemo(
    () =>
      directory.map(({ path, label, requiresAi }) => ({
        label,
        path: getAISettingsAbsPath(path),
        enabled: !requiresAi || aiEnabled || path === tab,
      })),
    [aiEnabled, tab]
  )

  useSetBreadcrumbs(useMemo(() => getAISettingsBreadcrumbs(tab ?? ''), [tab]))

  return (
    <>
      <SettingsToolbarTabs directory={tabs} />
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
    </>
  )
}

const getAISettingsAbsPath = (tab: string) => `${AI_SETTINGS_ABS_PATH}/${tab}`
