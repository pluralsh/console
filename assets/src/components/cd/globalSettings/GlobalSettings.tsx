import { useTheme } from 'styled-components'
import { Outlet, useLocation, useOutletContext } from 'react-router-dom'

import { CD_REL_PATH, GLOBAL_SETTINGS_ABS_PATH } from 'routes/cdRoutesConsts'

import { ResponsiveLayoutContentContainer } from 'components/utils/layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'
import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { ResponsiveLayoutSidenavContainer } from 'components/utils/layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from 'components/utils/layout/ResponsiveLayoutSpacer'
import { SideNavEntries } from 'components/layout/SideNavEntries'

import {
  DeploymentSettingsFragment,
  useDeploymentSettingsQuery,
} from 'generated/graphql'

import { useContext, useMemo } from 'react'

import { LoginContext } from 'components/contexts'

import { CD_BASE_CRUMBS } from '../ContinuousDeployment'

export const getGlobalSettingsBreadcrumbs = ({ page }: { page: string }) => [
  ...CD_BASE_CRUMBS,
  { label: 'global settings', url: `${GLOBAL_SETTINGS_ABS_PATH}` },
  { label: page, url: `${CD_REL_PATH}/clusters/${page}` },
]

const directory = [
  {
    path: 'permissions/read',
    label: 'Read permissions',
  },
  {
    path: 'permissions/write',
    label: 'Write permissions',
  },
  {
    path: 'permissions/create',
    label: 'Create permissions',
  },
  {
    path: 'permissions/git',
    label: 'Git write permissions',
  },

  {
    path: 'repositories',
    label: 'Repositories',
  },
  {
    path: 'auto-update',
    label: 'Auto Update',
  },
]

type GlobalSettingsContextType = {
  refetch: () => void
  deploymentSettings: DeploymentSettingsFragment
}

export const useGlobalSettingsContext = () =>
  useOutletContext<GlobalSettingsContextType>()

export function GlobalSettings() {
  const theme = useTheme()
  const { pathname } = useLocation()
  const { configuration } = useContext<any>(LoginContext)
  const { data, refetch } = useDeploymentSettingsQuery({})

  const outletContext = useMemo(
    () => ({
      refetch,
      ...data,
    }),
    [data, refetch]
  )

  const prunedDirectory = useMemo(
    () =>
      directory.filter(
        ({ path }) =>
          path !== 'auto-update' ||
          (configuration?.byok && !data?.deploymentSettings?.selfManaged)
      ),
    [configuration, data]
  )

  return (
    <ResponsiveLayoutPage>
      <ResponsiveLayoutSidenavContainer>
        <div
          css={{
            overflowY: 'auto',
            paddingBottom: theme.spacing.medium,
          }}
        >
          <SideNavEntries
            directory={prunedDirectory}
            pathname={pathname}
            pathPrefix={GLOBAL_SETTINGS_ABS_PATH}
          />
        </div>
      </ResponsiveLayoutSidenavContainer>
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutContentContainer role="main">
        {data && <Outlet context={outletContext} />}
      </ResponsiveLayoutContentContainer>
      <ResponsiveLayoutSidecarContainer />
      <ResponsiveLayoutSpacer />
    </ResponsiveLayoutPage>
  )
}
