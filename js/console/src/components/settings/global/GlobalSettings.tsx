import { Outlet, useLocation, useOutletContext } from 'react-router-dom'

import {
  DeploymentSettingsFragment,
  useDeploymentSettingsQuery,
} from 'generated/graphql'

import { useMemo } from 'react'

import { GLOBAL_SETTINGS_ABS_PATH } from 'routes/settingsRoutesConst'

import { useSetBreadcrumbs } from '@pluralsh/design-system'

import { SETTINGS_BREADCRUMBS, SettingsToolbarTabs } from '../Settings'

export const getGlobalSettingsBreadcrumbs = (page: string) => [
  ...SETTINGS_BREADCRUMBS,
  { label: 'global', url: GLOBAL_SETTINGS_ABS_PATH },
  { label: page, url: `${GLOBAL_SETTINGS_ABS_PATH}/${page}` },
]

const directory = [
  { path: 'general', label: 'General' },
  { path: 'permissions', label: 'Permissions' },
  { path: 'repositories', label: 'Repositories' },
  { path: 'agents', label: 'Agent config' },
  { path: 'observability', label: 'Observability' },
  { path: 'oidc', label: 'OIDC' },
  { path: 'smtp', label: 'SMTP' },
]

const tabs = directory.map(({ path, label }) => ({
  label,
  path: `${GLOBAL_SETTINGS_ABS_PATH}/${path}`,
}))

type GlobalSettingsContextType = {
  refetch: () => void
  deploymentSettings: DeploymentSettingsFragment
  logsEnabled?: boolean
  metricsEnabled?: boolean
}

export const useGlobalSettingsContext = () =>
  useOutletContext<GlobalSettingsContextType>()

export function GlobalSettings() {
  const { pathname } = useLocation()
  const { data, refetch } = useDeploymentSettingsQuery({})

  const outletContext = useMemo(
    () => ({
      refetch,
      ...data,
      logsEnabled: !!data?.deploymentSettings?.lokiConnection,
      metricsEnabled: !!data?.deploymentSettings?.prometheusConnection,
    }),
    [data, refetch]
  )

  const currentTab = directory.find((tab) =>
    pathname?.startsWith(`${GLOBAL_SETTINGS_ABS_PATH}/${tab.path}`)
  )

  useSetBreadcrumbs(
    useMemo(
      () => getGlobalSettingsBreadcrumbs(currentTab?.path ?? ''),
      [currentTab]
    )
  )

  return (
    <>
      <SettingsToolbarTabs directory={tabs} />
      {data && <Outlet context={outletContext} />}
    </>
  )
}
