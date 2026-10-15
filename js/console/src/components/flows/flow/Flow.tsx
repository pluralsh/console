import {
  Button,
  EmptyState,
  PeopleIcon,
  ReturnIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { PageHeaderContext } from 'components/cd/ContinuousDeployment'
import {
  PermissionsIdType,
  PermissionsModal,
} from 'components/cd/utils/PermissionsModal'
import { useLogin } from 'components/contexts'
import { useCurrentFlow } from 'components/flows/hooks/useCurrentFlow'
import { PageWithSidebar } from 'components/layout/PageLayout'
import { PageToolbar } from 'components/layout/PageToolbar'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { hasAccess } from 'components/utils/persona'
import { SubtabDirectory } from 'components/utils/SubTabs'
import {
  FlowBasicWithBindingsFragment,
  PersonaConfigurationFragment,
} from 'generated/graphql'
import { ReactNode, createContext, use, useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useMatch } from 'react-router-dom'
import {
  FLOW_WORKBENCHES_REL_PATH,
  FLOWS_ABS_PATH,
} from 'routes/flowRoutesConsts'
import { VULNERABILITY_REPORTS_REL_PATH } from 'routes/securityRoutesConsts'
import styled from 'styled-components'
import { FlowWorkbenchJobLauncher } from './FlowWorkbenchJobLauncher'

function getDirectory(
  personaConfiguration: Nullable<PersonaConfigurationFragment>
): SubtabDirectory {
  const all = !!personaConfiguration?.all
  const flows = personaConfiguration?.flows

  return [
    { path: 'services', label: 'Services', enabled: true },
    {
      path: FLOW_WORKBENCHES_REL_PATH,
      label: 'Workbenches',
      enabled: all || !!flows?.workbenches,
    },
    {
      path: 'pipelines',
      label: 'Pipelines',
      enabled: all || !!flows?.pipelines,
    },
    {
      path: 'previews',
      label: 'Previews',
      enabled: all || !!flows?.previews,
    },
    { path: 'alerts', label: 'Alerts', enabled: true },
    {
      path: VULNERABILITY_REPORTS_REL_PATH,
      label: 'Vulnerabilities',
      enabled: true,
    },
  ]
}

const SIDE_PANEL_WIDTH = 250

export type FlowOutletContext = {
  flow: Nullable<FlowBasicWithBindingsFragment>
}

type FlowSidePanelContextValue = {
  setSidePanelContent: (content: ReactNode | null) => void
}

const FlowSidePanelContext = createContext<FlowSidePanelContextValue>({
  setSidePanelContent: () => {},
})

export function useFlowSidePanel() {
  return use(FlowSidePanelContext)
}

export const getFlowBreadcrumbs = (flowName: string = '', tab: string = '') =>
  flowName
    ? [
        { label: 'flows', url: FLOWS_ABS_PATH },
        { label: flowName, url: `${FLOWS_ABS_PATH}/${flowName}` },
        { label: tab, url: `${FLOWS_ABS_PATH}/${flowName}/${tab}` },
      ]
    : []

export function Flow() {
  const { search } = useLocation()
  const flowsPath = `${FLOWS_ABS_PATH}${search}`
  const [showPermissions, setShowPermissions] = useState(false)
  const [sidePanelContent, setSidePanelContent] = useState<ReactNode | null>(
    null
  )
  const { personaConfiguration } = useLogin()
  const permissions = hasAccess(personaConfiguration, 'flows.permissions')
  const startWorkbenchJob = hasAccess(
    personaConfiguration,
    'flows.startWorkbenchJob'
  )
  const { flowIdOrName, flowData, loading, error, refetch } = useCurrentFlow()
  const tab = useMatch(`${FLOWS_ABS_PATH}/${flowIdOrName}/:tab/*`)?.params.tab
  const flow = flowData?.flow

  const [headerContent, setHeaderContent] = useState<ReactNode | null>(null)
  const headerCtx = useMemo(() => ({ setHeaderContent }), [setHeaderContent])
  const sidePanelCtx = useMemo(
    () => ({ setSidePanelContent }),
    [setSidePanelContent]
  )
  const outletCtx: FlowOutletContext = useMemo(() => ({ flow }), [flow])
  const flowPath = `${FLOWS_ABS_PATH}/${flowIdOrName}`
  const tabs = useMemo(
    () =>
      getDirectory(personaConfiguration).map((entry) => ({
        ...entry,
        path: `${flowPath}/${entry.path}`,
      })),
    [personaConfiguration, flowPath]
  )

  useSetBreadcrumbs(
    useMemo(() => getFlowBreadcrumbs(flow?.name || '', tab), [flow?.name, tab])
  )

  if (error) return <GqlError error={error} />
  if (!flowData && loading) return <LoadingIndicator />
  if (!flow)
    return (
      <EmptyState message="Flow not found.">
        <Button
          floating
          as={Link}
          to={flowsPath}
          startIcon={<ReturnIcon />}
        >
          View Flows
        </Button>
      </EmptyState>
    )

  return (
    <PageHeaderContext value={headerCtx}>
      <FlowSidePanelContext value={sidePanelCtx}>
        <PageWithSidebar
          sidebar={
            <SidePanelWrapSC $open={!!sidePanelContent}>
              <SidePanelInnerSC $open={!!sidePanelContent}>
                {sidePanelContent}
              </SidePanelInnerSC>
            </SidePanelWrapSC>
          }
          toolbar={
            <PageToolbar
              tabs={tabs}
              activeFn={(path) => path === `${flowPath}/${tab}`}
            >
              {headerContent}
              {permissions && (
                <Button
                  secondary
                  small
                  startIcon={<PeopleIcon size={12} />}
                  onClick={() => setShowPermissions(true)}
                >
                  Permissions
                </Button>
              )}
              {startWorkbenchJob && <FlowWorkbenchJobLauncher flow={flow} />}
            </PageToolbar>
          }
        >
          <ContentSC>
            <Outlet context={outletCtx} />
          </ContentSC>
        </PageWithSidebar>
      </FlowSidePanelContext>
      <PermissionsModal
        id={flow.id}
        type={PermissionsIdType.Flow}
        bindings={flow}
        header="Flow permissions"
        refetch={refetch}
        open={showPermissions}
        onClose={() => setShowPermissions(false)}
      />
    </PageHeaderContext>
  )
}

const SidePanelWrapSC = styled.div<{ $open: boolean }>(({ $open }) => ({
  display: 'flex',
  width: $open ? SIDE_PANEL_WIDTH : 0,
  flexShrink: 0,
  minWidth: 0,
  overflow: 'hidden',
  transition: 'width 0.25s ease',
}))

const SidePanelInnerSC = styled.div<{ $open: boolean }>(({ $open }) => ({
  display: 'flex',
  width: SIDE_PANEL_WIDTH,
  flexShrink: 0,
  opacity: $open ? 1 : 0,
  transform: $open ? 'translateX(0)' : 'translateX(-8px)',
  transition: 'opacity 0.2s ease, transform 0.25s ease',
}))

const ContentSC = styled.div(({ theme }) => ({
  display: 'block',
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  width: '100%',
  overflow: 'auto',
  padding: theme.spacing.large,
}))
