import { Card, Code, Flex, Markdown } from '@pluralsh/design-system'
import { Body2P } from 'components/utils/typography/Text'
import { ChatTypeAttributes } from 'generated/graphql'
import isJson from 'is-json'
import { useTheme } from 'styled-components'

export function ToolCallContent({
  content,
  attributes,
}: {
  content: string
  attributes: Nullable<ChatTypeAttributes>
}) {
  const { spacing } = useTheme()

  return (
    <Flex
      direction="column"
      gap="small"
      width="100%"
    >
      {attributes?.tool?.arguments && (
        <>
          <Body2P $color="text-light">Arguments:</Body2P>
          <Code
            language="json"
            showHeader={false}
            css={{ maxHeight: 324 }}
          >
            {JSON.stringify(attributes.tool.arguments, null, 2)}
          </Code>
        </>
      )}
      <Body2P $color="text-light">Response:</Body2P>
      {isJson(content) ? (
        <Code
          fillLevel={2}
          language="json"
          showHeader={false}
          css={{ maxHeight: 324 }}
        >
          {prettifyJsonStr(content)}
        </Code>
      ) : (
        <Card
          fillLevel={2}
          css={{ padding: spacing.medium, overflow: 'auto', maxHeight: 324 }}
        >
          <Markdown
            text={content}
            css={{ whiteSpace: 'pre-line' }}
          />
        </Card>
      )}
    </Flex>
  )
}

function prettifyJsonStr(message: string): string {
  try {
    return JSON.stringify(JSON.parse(message), null, 2)
  } catch {
    return message
  }
}
