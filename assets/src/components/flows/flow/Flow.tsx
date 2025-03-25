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
import {
  PermissionsIdType,
  PermissionsModal,
} from 'components/cd/utils/PermissionsModal'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { SubtabDirectory, SubTabs } from 'components/utils/SubTabs'
import { StackedText } from 'components/utils/table/StackedText'
import { useFlowQuery } from 'generated/graphql'
import { useMemo, useState } from 'react'
import { Link, Outlet, useMatch, useParams } from 'react-router-dom'
import { AI_MCP_SERVERS_ABS_PATH } from 'routes/aiRoutesConsts'
import {
  FLOW_MCP_CONNECTIONS_REL_PATH,
  FLOWS_ABS_PATH,
} from 'routes/flowRoutesConsts'
import styled from 'styled-components'
import { ChangeMcpConnectionsModal } from './ChangeMcpConnectionsModal'

const directory: SubtabDirectory = [
  { path: 'services', label: 'Services' },
  { path: 'pipelines', label: 'Pipelines' },
  { path: 'prs', label: 'PRs' },
  { path: 'alerts', label: 'Alerts' },
  { path: FLOW_MCP_CONNECTIONS_REL_PATH, label: 'MCP connections' },
]

const getBreadcrumbs = (flowId: string = '', tab: string = '') => [
  { label: 'flows', url: FLOWS_ABS_PATH },
  { label: flowId, url: `${FLOWS_ABS_PATH}/${flowId}` },
  { label: tab, url: `${FLOWS_ABS_PATH}/${flowId}/${tab}` },
]

export function Flow() {
  const { flowId } = useParams()
  const tab = useMatch(`${FLOWS_ABS_PATH}/${flowId}/:tab/*`)?.params.tab
  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(flowId, tab), [flowId, tab]))
  const [showPermissions, setShowPermissions] = useState(false)
  const [showConnectionsModal, setShowConnectionsModal] = useState(false)

  const { data, loading, error, refetch } = useFlowQuery({
    variables: { id: flowId ?? '' },
  })
  const flow = data?.flow

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
    <>
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
        </HeaderSC>
        <Flex justify="space-between">
          <SubTabs directory={directory} />
          <Flex gap="small">
            <Button
              secondary
              as={Link}
              to={AI_MCP_SERVERS_ABS_PATH}
            >
              View all MCP servers
            </Button>
            <Button
              secondary
              onClick={() => setShowConnectionsModal(true)}
            >
              Change MCP connections
            </Button>
          </Flex>
        </Flex>
        <ContentSC>
          <Outlet />
        </ContentSC>
      </WrapperSC>
      {/* Modals */}
      <ChangeMcpConnectionsModal
        open={showConnectionsModal}
        onClose={() => setShowConnectionsModal(false)}
      />
      <PermissionsModal
        id={flow.id}
        type={PermissionsIdType.Flow}
        bindings={flow}
        header="Flow permissions"
        refetch={refetch}
        open={showPermissions}
        onClose={() => setShowPermissions(false)}
      />
    </>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  padding: theme.spacing.large,
  height: '100%',
  width: '100%',
  overflow: 'hidden',
}))

const HeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.medium,
  alignItems: 'center',
}))

const ContentSC = styled.div({
  display: 'flex',
  height: '100%',
  width: '100%',
  overflow: 'hidden',
})
