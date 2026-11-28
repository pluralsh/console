import { Code, Flex } from '@pluralsh/design-system'
import { CaptionP } from 'components/utils/typography/Text'
import {
  getWorkbenchToolLabel,
  WorkbenchToolIcon,
} from 'components/workbenches/tools/workbenchToolsUtils'
import { use } from 'react'
import { ApprovalPreview } from './devboxApprovals'
import { McpToolIndexContext, mcpIntegration } from './devboxIntegrations'
import { DevboxFileDiff } from './DevboxFileDiff'

export function DevboxApprovalPreview({
  preview,
}: {
  preview: ApprovalPreview
}) {
  switch (preview.kind) {
    case 'edit':
      return (
        <Flex
          direction="column"
          gap="small"
          data-preview="edit"
        >
          {preview.diffs.map((diff, i) => (
            <DevboxFileDiff
              key={i}
              diff={diff}
            />
          ))}
        </Flex>
      )
    case 'command':
      return (
        <Flex
          direction="column"
          gap="xxsmall"
          data-preview="command"
        >
          {preview.description && (
            <CaptionP $color="text-light">{preview.description}</CaptionP>
          )}
          <Code
            language="sh"
            showHeader={false}
          >
            {preview.command}
          </Code>
          {preview.cwd && (
            <CaptionP $color="text-xlight">in {preview.cwd}</CaptionP>
          )}
        </Flex>
      )
    case 'mcp':
      return (
        <Flex
          direction="column"
          gap="xxsmall"
          data-preview="mcp"
        >
          <McpPreviewTitle
            server={preview.server}
            tool={preview.tool}
          />
          <Code
            language="json"
            showHeader={false}
          >
            {JSON.stringify(preview.args ?? {}, null, 2)}
          </Code>
        </Flex>
      )
    case 'generic':
      return (
        <Code
          language="json"
          showHeader={false}
          data-preview="generic"
        >
          {JSON.stringify(preview.input, null, 2)}
        </Code>
      )
  }
}

// names the integration a workbench MCP tool calls, so an approver can see what the call reaches
function McpPreviewTitle({ server, tool }: { server: string; tool: string }) {
  const integration = mcpIntegration(server, tool, use(McpToolIndexContext))
  if (!integration)
    return (
      <CaptionP $color="text-light">
        <b>{tool}</b> on the {server} MCP server
      </CaptionP>
    )
  const label =
    getWorkbenchToolLabel(integration.type, integration.provider) ??
    integration.workbenchToolName
  return (
    <Flex
      align="center"
      gap="xsmall"
    >
      <WorkbenchToolIcon
        type={integration.type}
        provider={integration.provider}
        size={14}
        css={{ flexShrink: 0 }}
      />
      <CaptionP $color="text-light">
        <b>{integration.action}</b> on {label}
        {integration.workbenchToolName &&
        integration.workbenchToolName !== label
          ? ` (${integration.workbenchToolName})`
          : ''}{' '}
        <span title={`${server}/${tool}`}>via the workbench MCP server</span>
      </CaptionP>
    </Flex>
  )
}
