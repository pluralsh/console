import {
  Breadcrumb,
  Button,
  EmptyState,
  Flex,
  SidePanelOpenIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { StackedTextSC } from 'components/utils/table/StackedText'
import { useWebhookSetupGuidePanel } from 'components/workbenches/workbench/webhooks/WebhookSetupGuidePanel'
import { McpServerCreateForm } from 'components/workbenches/tools/mcp-server/McpServerCreateForm'
import {
  getWorkbenchToolSetupGuideDocumentationUrl,
  getWorkbenchToolSetupGuideMarkdownPath,
} from 'components/workbenches/tools/workbenchToolSetupGuides'
import { useMcpServerQuery, WorkbenchToolType } from 'generated/graphql'
import { useEffect, useEffectEvent, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AI_SETTINGS_ABS_PATH,
  AI_SETTINGS_MCP_SERVERS_ABS_PATH,
  AI_SETTINGS_MCP_SERVER_ID_PARAM_ID,
  getAiSettingsMcpServerEditAbsPath,
} from 'routes/settingsRoutesConst'
import { useTheme } from 'styled-components'
import { SETTINGS_BREADCRUMBS } from '../../Settings'

export function McpServerEditSettings() {
  const navigate = useNavigate()
  const theme = useTheme()
  const params = useParams()
  const mcpServerId = params[AI_SETTINGS_MCP_SERVER_ID_PARAM_ID]
  const { data, loading, error } = useMcpServerQuery({
    variables: { id: mcpServerId ?? '' },
    skip: !mcpServerId,
    fetchPolicy: 'cache-and-network',
  })
  const server = data?.mcpServer
  const { isOpen, openSetupGuidePanel, closeSetupGuidePanel } =
    useWebhookSetupGuidePanel()
  const markdownPath = getWorkbenchToolSetupGuideMarkdownPath(
    WorkbenchToolType.Mcp
  )
  const documentationUrl = getWorkbenchToolSetupGuideDocumentationUrl(
    WorkbenchToolType.Mcp
  )
  const editPath = getAiSettingsMcpServerEditAbsPath({ mcpServerId })

  useSetBreadcrumbs(
    useMemo<Breadcrumb[]>(
      () => [
        ...SETTINGS_BREADCRUMBS,
        { label: 'ai', url: AI_SETTINGS_ABS_PATH },
        { label: 'mcp servers', url: AI_SETTINGS_MCP_SERVERS_ABS_PATH },
        { label: 'edit mcp server', url: editPath },
      ],
      [editPath]
    )
  )
  useSetPageHeaderContent(
    useMemo(
      () => (
        <Flex justifyContent="space-between">
          <StackedTextSC>
            <span
              css={{
                ...theme.partials.text.body2,
                color: theme.colors['text-light'],
              }}
            >
              Edit MCP server details and access policy.
            </span>
          </StackedTextSC>
          {!isOpen && !!markdownPath && (
            <Button
              secondary
              startIcon={<SidePanelOpenIcon />}
              onClick={() =>
                openSetupGuidePanel({
                  documentationUrl,
                  markdownPath,
                })
              }
              css={{ whiteSpace: 'nowrap' }}
            >
              Setup guide
            </Button>
          )}
        </Flex>
      ),
      [documentationUrl, isOpen, markdownPath, openSetupGuidePanel, theme]
    )
  )

  const openedGuide = useRef(false)
  const openGuide = useEffectEvent(() => {
    if (!markdownPath) return
    openSetupGuidePanel({
      documentationUrl,
      markdownPath,
    })
  })
  useEffect(() => {
    if (!server || openedGuide.current) return
    openedGuide.current = true
    openGuide()
  }, [server])

  const onUnmount = useEffectEvent(() => {
    if (isOpen) closeSetupGuidePanel()
  })
  useEffect(() => () => onUnmount(), [])

  if (error) return <GqlError error={error} />
  if (loading && !server) return <LoadingIndicator />

  return server ? (
    <McpServerCreateForm
      key={server.id}
      existingServer={server}
      backPath={AI_SETTINGS_MCP_SERVERS_ABS_PATH}
      onSaved={() => navigate(AI_SETTINGS_MCP_SERVERS_ABS_PATH)}
      showSetupGuideButton={false}
    />
  ) : (
    <EmptyState message="MCP server not found.">
      <Button onClick={() => navigate(AI_SETTINGS_MCP_SERVERS_ABS_PATH)}>
        Back to all MCP servers
      </Button>
    </EmptyState>
  )
}
