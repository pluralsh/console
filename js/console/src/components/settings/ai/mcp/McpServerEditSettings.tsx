import {
  Breadcrumb,
  Button,
  EmptyState,
  SidePanelOpenIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { PageToolbarPortal } from 'components/layout/PageToolbar'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
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
import { SETTINGS_BREADCRUMBS, SettingsDescription } from '../../Settings'

export function McpServerEditSettings() {
  const navigate = useNavigate()
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

  return (
    <>
      <SettingsDescription>
        Edit MCP server details and access policy.
      </SettingsDescription>
      {!isOpen && !!markdownPath && (
        <PageToolbarPortal>
          <Button
            secondary
            small
            startIcon={<SidePanelOpenIcon />}
            onClick={() =>
              openSetupGuidePanel({
                documentationUrl,
                markdownPath,
              })
            }
          >
            Setup guide
          </Button>
        </PageToolbarPortal>
      )}
      {error ? (
        <GqlError error={error} />
      ) : loading && !server ? (
        <LoadingIndicator />
      ) : server ? (
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
      )}
    </>
  )
}
