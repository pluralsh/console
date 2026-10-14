import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { PageHeaderContext } from 'components/cd/ContinuousDeployment'
import { useCDEnabled } from 'components/cd/utils/useCDEnabled'
import { useLogin } from 'components/contexts'
import {
  PageColumnSC,
  PageRowSC,
  PageSidecarSlotContext,
  PageSidecarSlotSC,
} from 'components/layout/PageLayout'
import {
  PageToolbar,
  PageToolbarSlotContext,
} from 'components/layout/PageToolbar'
import { SubtabDirectory } from 'components/utils/SubTabs'
import { ReactNode, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import {
  CATALOGS_REL_PATH,
  PR_AUTOMATIONS_REL_PATH,
  PR_OUTSTANDING_REL_PATH,
  PR_REL_PATH,
  PR_SCM_REL_PATH,
  SELF_SERVICE_ABS_PATH,
} from 'routes/selfServiceRoutesConsts'
import styled from 'styled-components'

const getDirectory = (prsEnabled: boolean): SubtabDirectory => [
  {
    path: CATALOGS_REL_PATH,
    label: 'Service catalog',
  },
  {
    path: `${PR_REL_PATH}/${PR_AUTOMATIONS_REL_PATH}`,
    label: 'PR automations',
    enabled: prsEnabled,
  },
  {
    path: `${PR_REL_PATH}/${PR_OUTSTANDING_REL_PATH}`,
    label: 'Outstanding PRs',
    enabled: prsEnabled,
  },
  {
    path: `${PR_REL_PATH}/${PR_SCM_REL_PATH}`,
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
        ?.label?.toString()
        ?.toLowerCase() ?? ''
    return { directory, breadcrumbs: getSelfServiceBreadcrumbs(tabName) }
  }, [prsEnabled, pathname])

  const tabs = useMemo(
    () =>
      directory.map((entry) => ({
        ...entry,
        path: `${SELF_SERVICE_ABS_PATH}/${entry.path}`,
      })),
    [directory]
  )
  useSetBreadcrumbs(breadcrumbs)

  const [headerContent, setHeaderContent] = useState<ReactNode>()
  const ctx = useMemo(() => ({ setHeaderContent }), [setHeaderContent])
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null)
  const [sidecarSlot, setSidecarSlot] = useState<HTMLDivElement | null>(null)

  return (
    <PageColumnSC>
      <PageToolbar
        tabs={tabs}
        slotRef={setToolbarSlot}
      >
        {headerContent}
      </PageToolbar>
      <PageRowSC>
        <PageWrapperSC>
          <PageHeaderContext value={ctx}>
            <PageToolbarSlotContext value={toolbarSlot}>
              <PageSidecarSlotContext value={sidecarSlot}>
                <Outlet />
              </PageSidecarSlotContext>
            </PageToolbarSlotContext>
          </PageHeaderContext>
        </PageWrapperSC>
        <PageSidecarSlotSC ref={setSidecarSlot} />
      </PageRowSC>
    </PageColumnSC>
  )
}

const PageWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  flex: 1,
  minWidth: 0,
  height: '100%',
  overflow: 'auto',
  padding: theme.spacing.large,
  '& > *': {
    width: '100%',
    maxWidth: theme.breakpoints.desktopLarge,
    alignSelf: 'center',
  },
}))
