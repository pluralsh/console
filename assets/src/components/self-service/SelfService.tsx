import { Flex, useSetBreadcrumbs } from '@pluralsh/design-system'
import { PageHeaderContext } from 'components/cd/ContinuousDeployment'
import { useCDEnabled } from 'components/cd/utils/useCDEnabled'
import { useLogin } from 'components/contexts'
import { SubTabs, SubtabDirectory } from 'components/utils/SubTabs'
import { ReactNode, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import {
  CATALOGS_ABS_PATH,
  PR_AUTOMATIONS_ABS_PATH,
  PR_OUTSTANDING_ABS_PATH,
  PR_SCM_ABS_PATH,
  SELF_SERVICE_ABS_PATH,
} from 'routes/selfServiceRoutesConsts'
import styled from 'styled-components'

const getDirectory = (prsEnabled: boolean): SubtabDirectory => [
  {
    path: CATALOGS_ABS_PATH,
    label: 'Service catalog',
  },
  {
    path: PR_OUTSTANDING_ABS_PATH,
    label: 'Outstanding PRs',
    enabled: prsEnabled,
  },
  {
    path: PR_AUTOMATIONS_ABS_PATH,
    label: 'PR automations',
    enabled: prsEnabled,
  },
  {
    path: PR_SCM_ABS_PATH,
    label: 'SCM management',
    enabled: prsEnabled,
  },
]

export const getSelfServiceBreadcrumbs = (tab: string, path?: string) => [
  { label: 'self service', url: SELF_SERVICE_ABS_PATH },
  { label: tab, url: path },
]

export function SelfService() {
  const isCDEnabled = useCDEnabled({ redirect: false })
  const { personaConfiguration } = useLogin()
  const prsEnabled =
    isCDEnabled &&
    !!(personaConfiguration?.all || personaConfiguration?.sidebar?.pullRequests)

  const { pathname } = useLocation()

  const { directory, breadcrumbs } = useMemo(() => {
    const directory = getDirectory(prsEnabled)
    const tabName =
      directory
        .find(({ path }) => pathname.includes(path))
        ?.label?.toLowerCase() ?? ''
    return { directory, breadcrumbs: getSelfServiceBreadcrumbs(tabName) }
  }, [prsEnabled, pathname])

  useSetBreadcrumbs(breadcrumbs)

  const [headerContent, setHeaderContent] = useState<ReactNode>()
  const ctx = useMemo(() => ({ setHeaderContent }), [setHeaderContent])

  return (
    <PageWrapperSC>
      <Flex
        gap="medium"
        width="100%"
        justify="space-between"
      >
        <SubTabs directory={directory} />
        <div>{headerContent}</div>
      </Flex>
      <PageHeaderContext value={ctx}>
        <Outlet />
      </PageHeaderContext>
    </PageWrapperSC>
  )
}

const PageWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'center',
  gap: theme.spacing.medium,
  height: '100%',
  width: '100%',
  overflow: 'hidden',
  padding: theme.spacing.large,
  maxWidth: theme.breakpoints.desktopLarge,
}))
