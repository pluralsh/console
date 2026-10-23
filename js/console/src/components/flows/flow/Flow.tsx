import {
  AppIcon,
  type Breadcrumb,
  Button,
  EmptyState,
  FlowIcon,
  InfoOutlineIcon,
  ListBoxItem,
  PeopleIcon,
  ReturnIcon,
  Tooltip,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { PageHeaderContext } from 'components/cd/ContinuousDeployment'
import {
  PermissionsIdType,
  PermissionsModal,
} from 'components/cd/utils/PermissionsModal'
import { useLogin } from 'components/contexts'
import { useCurrentFlow } from 'components/flows/hooks/useCurrentFlow'
import { CrumbSelect } from 'components/layout/CrumbSelect'
import { PageWithSidebar } from 'components/layout/PageLayout'
import { PageToolbar } from 'components/layout/PageToolbar'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { hasAccess } from 'components/utils/persona'
import { SubtabDirectory } from 'components/utils/SubTabs'
import { TRUNCATE } from 'components/utils/truncate'
import {
  FlowBasicWithBindingsFragment,
  PersonaConfigurationFragment,
  useFlowsQuery,
} from 'generated/graphql'
import { ReactNode, createContext, use, useMemo, useState } from 'react'
import {
  Link,
  Outlet,
  useLocation,
  useMatch,
  useNavigate,
} from 'react-router-dom'
import {
  FLOW_WORKBENCHES_REL_PATH,
  FLOWS_ABS_PATH,
} from 'routes/flowRoutesConsts'
import { VULNERABILITY_REPORTS_REL_PATH } from 'routes/securityRoutesConsts'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
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

/** `switchable` turns the flow crumb into a menu for switching flow in place. */
export const getFlowBreadcrumbs = (
  flowName: string = '',
  tab: string = '',
  switchable = false
): Breadcrumb[] =>
  flowName
    ? [
        { label: 'flows', url: FLOWS_ABS_PATH },
        switchable
          ? {
              label: (
                <FlowCrumbSelect
                  flowName={flowName}
                  tab={tab}
                />
              ),
              textValue: flowName,
            }
          : { label: flowName, url: `${FLOWS_ABS_PATH}/${flowName}` },
        { label: tab, url: `${FLOWS_ABS_PATH}/${flowName}/${tab}` },
      ]
    : []

function FlowCrumbSelect({ flowName, tab }: { flowName: string; tab: string }) {
  const navigate = useNavigate()
  const { data } = useFlowsQuery({
    variables: { first: 100 },
    fetchPolicy: 'cache-first',
  })
  const flows = useMemo(() => {
    const options = mapExistingNodes(data?.flows)
    return options.some(({ name }) => name === flowName)
      ? options
      : [{ name: flowName, icon: null }, ...options]
  }, [data?.flows, flowName])

  return (
    <CrumbSelect
      ariaLabel="Flow"
      label={flowName}
      selectedKey={flowName}
      onSelectionChange={(name) =>
        navigate(`${FLOWS_ABS_PATH}/${name}/${tab || 'services'}`)
      }
    >
      {flows.map(({ name, icon }) => (
        <ListBoxItem
          key={name}
          label={name}
          textValue={name}
          leftContent={
            <AppIcon
              size="xxsmall"
              url={icon ?? ''}
              icon={<FlowIcon />}
            />
          }
        />
      ))}
    </CrumbSelect>
  )
}

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
    useMemo(
      () => getFlowBreadcrumbs(flow?.name || '', tab, true),
      [flow?.name, tab]
    )
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
              heading={<FlowToolbarTitle flow={flow} />}
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

function FlowToolbarTitle({ flow }: { flow: FlowBasicWithBindingsFragment }) {
  return (
    <>
      <AppIcon
        size="xxsmall"
        url={flow.icon ?? ''}
        icon={<FlowIcon />}
      />
      <FlowNameSC title={flow.name}>{flow.name}</FlowNameSC>
      {flow.description && (
        <Tooltip
          label={flow.description}
          placement="bottom"
        >
          <InfoOutlineIcon
            size={14}
            color="icon-xlight"
            aria-label={flow.description}
            css={{ flexShrink: 0 }}
          />
        </Tooltip>
      )}
    </>
  )
}

const FlowNameSC = styled.span(({ theme }) => ({
  ...theme.partials.text.body2Bold,
  ...TRUNCATE,
  color: theme.colors.text,
  minWidth: 0,
}))

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
