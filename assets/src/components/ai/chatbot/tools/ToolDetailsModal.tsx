import { Button, Card, Code, Flex, Modal } from '@pluralsh/design-system'
import { useChatbot } from 'components/ai/AIContext'
import { StackedText } from 'components/utils/table/StackedText'
import { McpToolFragment } from 'generated/graphql'
import { Link } from 'react-router-dom'
import { AI_MCP_SERVERS_ABS_PATH } from 'routes/aiRoutesConsts'
import { useTheme } from 'styled-components'

export function ToolDetailsModal({
  serverName,
  tool,
  open,
  onClose,
}: {
  serverName: string
  tool: Nullable<McpToolFragment>
  open: boolean
  onClose: () => void
}) {
  const { closeChatbot } = useChatbot()

  if (!tool) return null

  return (
    <Modal
      open={open}
      size="large"
      onClose={onClose}
      header={
        <Flex
          justify="space-between"
          align="center"
        >
          <span>view tool</span>
          <Flex gap="small">
            <Button
              secondary
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              as={Link}
              secondary
              to={AI_MCP_SERVERS_ABS_PATH}
              onClick={() => {
                onClose()
                closeChatbot()
              }}
              style={{ textTransform: 'none' }}
            >
              View all MCP servers
            </Button>
          </Flex>
        </Flex>
      }
    >
      <Flex
        direction="column"
        gap="medium"
      >
        <Flex
          gap="medium"
          width="100%"
        >
          <ContentCardSC
            title="mcp server"
            content={serverName}
          />
          <ContentCardSC
            title="tool name"
            content={tool.name}
          />
        </Flex>
        <ContentCardSC
          title="description"
          content={tool.description ?? ''}
        />
        <Code
          showLineNumbers
          language="json"
          showHeader={false}
          maxHeight={400}
        >
          {JSON.stringify(tool.inputSchema, null, 1)}
        </Code>
      </Flex>
    </Modal>
  )
}

function ContentCardSC({ title, content }: { title: string; content: string }) {
  const { spacing } = useTheme()
  return (
    <Card
      css={{
        padding: spacing.medium,
        flex: 1,
        overflow: 'auto',
        maxHeight: 200,
      }}
    >
      <StackedText
        first={title}
        firstPartialType="overline"
        firstColor="text-xlight"
        second={content}
        secondPartialType="body2Bold"
        secondColor="text"
        css={{ gap: spacing.xxsmall }}
      />
    </Card>
  )
}
