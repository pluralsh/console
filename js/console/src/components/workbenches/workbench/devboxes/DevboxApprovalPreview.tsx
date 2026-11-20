import { Code, Flex } from '@pluralsh/design-system'
import { CaptionP } from 'components/utils/typography/Text'
import { ApprovalPreview } from './devboxApprovals'
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
          <CaptionP $color="text-light">
            <b>{preview.tool}</b> on the {preview.server} MCP server
          </CaptionP>
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
