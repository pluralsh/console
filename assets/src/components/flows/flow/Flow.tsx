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
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { SubtabDirectory, SubTabs } from 'components/utils/SubTabs'
import { StackedText } from 'components/utils/table/StackedText'
import { useFlowQuery } from 'generated/graphql'
import { ReactNode, useMemo, useState } from 'react'
import { Link, Outlet, useMatch, useParams } from 'react-router-dom'
import {
  FLOW_MCP_CONNECTIONS_REL_PATH,
  FLOWS_ABS_PATH,
} from 'routes/flowRoutesConsts'
import { VULNERABILITY_REPORTS_REL_PATH } from 'routes/securityRoutesConsts'
import styled from 'styled-components'

const directory: SubtabDirectory = [
  { path: 'services', label: 'Services' },
  { path: 'pipelines', label: 'Pipelines' },
  { path: 'previews', label: 'Previews' },
  { path: 'prs', label: 'PRs' },
  { path: 'alerts', label: 'Alerts' },
  { path: FLOW_MCP_CONNECTIONS_REL_PATH, label: 'MCP connections' },
  { path: VULNERABILITY_REPORTS_REL_PATH, label: 'Vulnerabilities' },
]

export const getFlowBreadcrumbs = (
  flowId: string = '',
  flowName: string = '',
  tab: string = ''
) =>
  flowName
    ? [
        { label: 'flows', url: FLOWS_ABS_PATH },
        { label: flowName, url: `${FLOWS_ABS_PATH}/${flowId}` },
        { label: tab, url: `${FLOWS_ABS_PATH}/${flowId}/${tab}` },
      ]
    : []

export function Flow() {
  const { flowId } = useParams()
  const tab = useMatch(`${FLOWS_ABS_PATH}/${flowId}/:tab/*`)?.params.tab
  const [showPermissions, setShowPermissions] = useState(false)

  const { data, loading, error, refetch } = useFlowQuery({
    variables: { id: flowId ?? '' },
  })
  const flow = data?.flow

  useSetBreadcrumbs(
    useMemo(
      () => getFlowBreadcrumbs(flowId, flow?.name || '', tab),
      [flowId, flow, tab]
    )
  )

  const [headerContent, setHeaderContent] = useState<ReactNode | null>(null)
  const ctx = useMemo(() => ({ setHeaderContent }), [setHeaderContent])

  if (error) return <GqlError error={error} />
  if (!data && loading) return <LoadingIndicator />
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
    <PageHeaderContext value={ctx}>
      <WrapperSC>
        <HeaderSC>
          <IconFrame
            icon={<ReturnIcon />}
            clickable
            as={Link}
            size="large"
            type="secondary"
            to={FLOWS_ABS_PATH}
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
            flowId={flowId}
            bodyText="Start a Flow chat"
            summaryText={`Further questions about "${flow.name}" Flow`}
          />
        </HeaderSC>
        <Flex justify="space-between">
          <SubTabs directory={directory} />
          {headerContent}
        </Flex>
        <ContentSC>
          <Outlet context={flow} />
        </ContentSC>
      </WrapperSC>
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

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  padding: theme.spacing.large,
  height: '100%',
  width: '100%',
  maxWidth: theme.breakpoints.desktop,
  alignSelf: 'center',
  overflow: 'hidden',
}))

const HeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.medium,
  alignItems: 'center',
}))

const ContentSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  overflow: 'hidden',
})
