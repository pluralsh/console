import {
  AppIcon,
  Button,
  EmptyState,
  Flex,
  FlowIcon,
  IconFrame,
  PeopleIcon,
  ReturnIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ChatWithAIButton } from 'components/ai/chatbot/ChatbotButton'
import { PageHeaderContext } from 'components/cd/ContinuousDeployment'
import {
  PermissionsIdType,
  PermissionsModal,
} from 'components/cd/utils/PermissionsModal'
import { useCurrentFlow } from 'components/flows/hooks/useCurrentFlow'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { SubtabDirectory, SubTabs } from 'components/utils/SubTabs'
import { StackedText } from 'components/utils/table/StackedText'
import { FlowBasicWithBindingsFragment } from 'generated/graphql'
import { ReactNode, createContext, use, useMemo, useState } from 'react'
import { Link, Outlet, useMatch } from 'react-router-dom'
import {
  FLOW_MCP_CONNECTIONS_REL_PATH,
  FLOW_WORKBENCHES_REL_PATH,
  FLOWS_ABS_PATH,
} from 'routes/flowRoutesConsts'
import { VULNERABILITY_REPORTS_REL_PATH } from 'routes/securityRoutesConsts'
import styled from 'styled-components'

const directory: SubtabDirectory = [
  { path: 'services', label: 'Services' },
  { path: FLOW_WORKBENCHES_REL_PATH, label: 'Workbenches' },
  { path: 'pipelines', label: 'Pipelines' },
  { path: 'previews', label: 'Previews' },
  { path: 'prs', label: 'PRs' },
  { path: FLOW_MCP_CONNECTIONS_REL_PATH, label: 'MCP connections' },
  { path: 'alerts', label: 'Alerts' },
  { path: VULNERABILITY_REPORTS_REL_PATH, label: 'Vulnerabilities' },
]

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
  const [showPermissions, setShowPermissions] = useState(false)
  const [sidePanelContent, setSidePanelContent] = useState<ReactNode | null>(
    null
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
          to={FLOWS_ABS_PATH}
          startIcon={<ReturnIcon />}
        >
          View Flows
        </Button>
      </EmptyState>
    )

  return (
    <PageHeaderContext value={headerCtx}>
      <FlowSidePanelContext value={sidePanelCtx}>
        <WrapperSC>
          <BodySC>
            <SidePanelWrapSC $open={!!sidePanelContent}>
              <SidePanelInnerSC $open={!!sidePanelContent}>
                {sidePanelContent}
              </SidePanelInnerSC>
            </SidePanelWrapSC>
            <ContentSC>
              <HeaderSC>
                <IconFrame
                  icon={<ReturnIcon />}
                  clickable
                  as={Link}
                  size="large"
                  type="secondary"
                  to={FLOWS_ABS_PATH}
                  tooltip="Return to flows"
                />
                <Flex
                  gap="small"
                  align="center"
                  flex={1}
                >
                  <AppIcon
                    size="xxsmall"
                    url={flow.icon ?? ''}
                    icon={<FlowIcon />}
                  />
                  <StackedText
                    first={flow.name}
                    firstPartialType="body1Bold"
                    firstColor="text"
                    second={flow.description}
                    secondColor="text-xlight"
                  />
                </Flex>
                <Button
                  secondary
                  startIcon={<PeopleIcon />}
                  onClick={() => setShowPermissions(true)}
                >
                  Permissions
                </Button>
                <ChatWithAIButton
                  floating
                  flowId={flow.id}
                  bodyText="Start a Flow chat"
                  summaryText={`Further questions about "${flow.name}" Flow`}
                />
              </HeaderSC>
              <Flex justify="space-between">
                <SubTabs directory={directory} />
                {headerContent}
              </Flex>
              <OutletWrapSC>
                <Outlet context={outletCtx} />
              </OutletWrapSC>
            </ContentSC>
          </BodySC>
        </WrapperSC>
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

const WrapperSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  height: '100%',
  width: '100%',
  minHeight: 0,
  overflow: 'hidden',
})

const BodySC = styled.div({
  display: 'flex',
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  overflow: 'hidden',
})

const SidePanelWrapSC = styled.div<{ $open: boolean }>(({ theme, $open }) => ({
  display: 'flex',
  width: $open ? 250 : 0,
  height: '100%',
  flexShrink: 0,
  marginRight: $open ? theme.spacing.small : 0,
  minWidth: 0,
  overflow: 'hidden',
  transition: 'width 0.25s ease, margin-right 0.25s ease',
}))

const SidePanelInnerSC = styled.div<{ $open: boolean }>(({ $open }) => ({
  display: 'flex',
  width: 250,
  height: '100%',
  flexShrink: 0,
  opacity: $open ? 1 : 0,
  transform: $open ? 'translateX(0)' : 'translateX(-8px)',
  transition: 'opacity 0.2s ease, transform 0.25s ease',
}))

const HeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.medium,
  alignItems: 'center',
}))

const ContentSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  gap: theme.spacing.medium,
  minHeight: 0,
  minWidth: 0,
  overflow: 'hidden',
  padding: theme.spacing.large,
}))

const OutletWrapSC = styled.div({
  display: 'block',
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  width: '100%',
  overflow: 'auto',
})
