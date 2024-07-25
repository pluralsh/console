import { Outlet, useLocation, useOutletContext } from 'react-router-dom'

import {
  DeploymentSettingsFragment,
  useDeploymentSettingsQuery,
} from 'generated/graphql'

import { useContext, useMemo, useRef } from 'react'

import { LoginContext } from 'components/contexts'

import { GLOBAL_SETTINGS_ABS_PATH } from 'routes/settingsRoutesConst'

import { SubTab, TabList } from '@pluralsh/design-system'
import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import { LinkTabWrap } from 'components/utils/Tabs'

import { SETTINGS_BREADCRUMBS } from '../Settings'

export const getGlobalSettingsBreadcrumbs = (page: string) => [
  ...SETTINGS_BREADCRUMBS,
  { label: 'global', url: GLOBAL_SETTINGS_ABS_PATH },
  { label: page, url: `${GLOBAL_SETTINGS_ABS_PATH}/${page}` },
]

const getDirectory = ({
  autoUpdateEnabled,
}: {
  autoUpdateEnabled: boolean
}) => [
  {
    path: 'permissions',
    label: 'Permissions',
  },
  {
    path: 'repositories',
    label: 'Repositories',
  },
  {
    path: 'agents',
    label: 'Agent config',
  },
  {
    path: 'observability',
    label: 'Observability',
  },
  {
    path: 'auto-update',
    label: 'Auto Update',
    enabled: autoUpdateEnabled,
  },
]

type GlobalSettingsContextType = {
  refetch: () => void
  deploymentSettings: DeploymentSettingsFragment
  logsEnabled?: boolean
  metricsEnabled?: boolean
}

export const useGlobalSettingsContext = () =>
  useOutletContext<GlobalSettingsContextType>()

export function GlobalSettings() {
  const tabStateRef = useRef<any>(null)
  const { pathname } = useLocation()
  const { configuration } = useContext<any>(LoginContext)
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

  const directory = useMemo(
    () =>
      getDirectory({
        autoUpdateEnabled:
          configuration?.byok && !data?.deploymentSettings?.selfManaged,
      }),
    [configuration, data]
  )

  const currentTab = directory.find(
    (tab) => pathname?.startsWith(`${GLOBAL_SETTINGS_ABS_PATH}/${tab.path}`)
  )

  const headerContent = (
    <TabList
      scrollable
      paddingBottom="large"
      stateRef={tabStateRef}
      stateProps={{
        selectedKey: currentTab?.path,
      }}
    >
      {directory.map(({ label, path }) => (
        <LinkTabWrap
          subTab
          key={path}
          textValue={label}
          to={`${GLOBAL_SETTINGS_ABS_PATH}/${path}`}
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

  useSetPageHeaderContent(headerContent)

  return data ? <Outlet context={outletContext} /> : null
}
